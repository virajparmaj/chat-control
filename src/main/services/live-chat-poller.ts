import { shell } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { youtube_v3 } from 'googleapis'
import { pollLiveChatMessages } from './youtube-api'
import { convertCurrency } from './exchange-rate'
import { getQueries } from './database'
import { broadcastToRenderers } from './broadcast'
import { getAppPreferences } from './preferences'
import type { PaidMessageType } from '../../shared/ipc-types'

interface PollerOptions {
  liveChatId: string
  sessionId: string
  preferredCurrency: string
  initialPageToken?: string | null
  onSessionEnded?: () => Promise<void> | void
  onFatalError?: (message: string) => Promise<void> | void
  onDerivedStateChanged?: () => void
}

const SUPER_CHAT_TYPE = 'superChatEvent'
const SUPER_STICKER_TYPE = 'superStickerEvent'
const CHAT_ENDED_TYPE = 'chatEndedEvent'
const BASE_DELAY = 5000
const MAX_DELAY = 60000
const MAX_RETRIES = 5

export class LiveChatPoller {
  private liveChatId: string
  private sessionId: string
  private preferredCurrency: string
  private nextPageToken: string | null
  private pollingInterval = 5000
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private retryCount = 0
  private onSessionEnded?: PollerOptions['onSessionEnded']
  private onFatalError?: PollerOptions['onFatalError']
  private onDerivedStateChanged?: PollerOptions['onDerivedStateChanged']

  constructor(options: PollerOptions) {
    this.liveChatId = options.liveChatId
    this.sessionId = options.sessionId
    this.preferredCurrency = options.preferredCurrency
    this.nextPageToken = options.initialPageToken ?? null
    this.onSessionEnded = options.onSessionEnded
    this.onFatalError = options.onFatalError
    this.onDerivedStateChanged = options.onDerivedStateChanged
  }

  start(): void {
    if (this.running) return

    this.running = true
    this.retryCount = 0
    broadcastToRenderers('stream:status', { type: 'connected', sessionId: this.sessionId })
    this.poll()
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private async poll(): Promise<void> {
    if (!this.running) return

    try {
      broadcastToRenderers('stream:status', { type: 'polling', sessionId: this.sessionId })

      const result = await pollLiveChatMessages(this.liveChatId, this.nextPageToken ?? undefined)
      const polledAt = new Date().toISOString()
      this.nextPageToken = result.nextPageToken
      this.pollingInterval = result.pollingIntervalMillis
      this.retryCount = 0
      getQueries().updateSessionResumeState(this.sessionId, this.nextPageToken, polledAt, null)

      const chatEnded = result.messages.some((message) => message.snippet?.type === CHAT_ENDED_TYPE)
      const paidMessages = result.messages.filter(
        (message) =>
          message.snippet?.type === SUPER_CHAT_TYPE || message.snippet?.type === SUPER_STICKER_TYPE
      )

      for (const message of paidMessages) {
        await this.processPaidMessage(message)
      }

      if (chatEnded) {
        this.stop()
        await this.onSessionEnded?.()
        return
      }

      this.scheduleNextPoll()
    } catch (error: unknown) {
      await this.handleError(error)
    }
  }

  private async processPaidMessage(message: youtube_v3.Schema$LiveChatMessage): Promise<void> {
    const snippet = message.snippet
    const author = message.authorDetails
    if (!message.id || !snippet?.publishedAt || !author?.channelId || !author.displayName) {
      return
    }

    const isSuperChat = snippet.type === SUPER_CHAT_TYPE
    const details = isSuperChat ? snippet.superChatDetails : snippet.superStickerDetails
    if (!details || !details.amountMicros) {
      return
    }

    const amountMicros = Number.parseInt(details.amountMicros, 10)
    if (!Number.isFinite(amountMicros) || amountMicros <= 0) {
      return
    }

    const originalAmount = amountMicros / 1_000_000
    const originalCurrency = details.currency ?? 'USD'
    const convertedAmount = await convertCurrency(
      originalAmount,
      originalCurrency,
      this.preferredCurrency
    )

    const type: PaidMessageType = isSuperChat ? 'super_chat' : 'super_sticker'
    const tier = details.tier ?? 1
    const stickerMetadata = (snippet as Record<string, unknown>).superStickerMetadata as
      | Record<string, unknown>
      | undefined

    const messageRecord = {
      id: uuidv4(),
      youtubeMessageId: message.id,
      sessionId: this.sessionId,
      donorChannelId: author.channelId,
      donorDisplayName: author.displayName,
      donorAvatarUrl: author.profileImageUrl ?? null,
      type,
      amountMicros,
      originalCurrency,
      originalAmount,
      convertedAmount,
      convertedCurrency: convertedAmount !== null ? this.preferredCurrency : null,
      amountDisplayString: details.amountDisplayString ?? null,
      messageText: isSuperChat
        ? (snippet.superChatDetails?.userComment ?? snippet.displayMessage ?? null)
        : null,
      stickerId: !isSuperChat ? ((stickerMetadata?.stickerId as string | undefined) ?? null) : null,
      stickerAltText: !isSuperChat
        ? ((stickerMetadata?.altText as string | undefined) ??
          ((snippet.superStickerDetails as Record<string, unknown> | undefined)?.altText as
            | string
            | undefined) ??
          null)
        : null,
      tier,
      receivedAt: snippet.publishedAt,
      rawPayload: JSON.stringify(message)
    }

    const inserted = getQueries().ingestPaidMessage(messageRecord)
    if (!inserted) return

    if (getAppPreferences().soundEnabled) {
      shell.beep()
    }

    broadcastToRenderers('superchat:new', inserted)
    this.onDerivedStateChanged?.()
  }

  private async handleError(error: unknown): Promise<void> {
    if (!this.running) return

    const message = error instanceof Error ? error.message : String(error)
    getQueries().updateSessionResumeState(
      this.sessionId,
      this.nextPageToken,
      new Date().toISOString(),
      message
    )

    if (message.includes('404') || message.includes('liveChatNotFound')) {
      this.stop()
      await this.onSessionEnded?.()
      return
    }

    if (message.includes('quotaExceeded') || message.includes('rateLimitExceeded')) {
      this.stop()
      await this.onFatalError?.('YouTube API quota exceeded. Monitoring paused.')
      return
    }

    if (message.includes('403') || message.includes('401') || message.includes('Unauthorized')) {
      this.stop()
      await this.onFatalError?.('Authentication expired. Please sign in again.')
      return
    }

    this.retryCount += 1
    if (this.retryCount > MAX_RETRIES) {
      this.stop()
      await this.onFatalError?.(`Connection lost after ${MAX_RETRIES} retries.`)
      return
    }

    broadcastToRenderers('stream:status', {
      type: 'reconnecting',
      attempt: this.retryCount,
      sessionId: this.sessionId
    })

    const delay = Math.min(
      BASE_DELAY * Math.pow(2, this.retryCount - 1) + Math.random() * 1000,
      MAX_DELAY
    )

    this.timer = setTimeout(() => this.poll(), delay)
  }

  private scheduleNextPoll(): void {
    if (!this.running) return
    this.timer = setTimeout(() => this.poll(), this.pollingInterval)
  }
}
