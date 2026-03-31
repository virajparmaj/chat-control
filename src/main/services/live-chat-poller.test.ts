import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaidMessage } from '../../shared/ipc-types'
import { LiveChatPoller } from './live-chat-poller'

const {
  shellBeep,
  pollLiveChatMessages,
  convertCurrency,
  updateSessionResumeState,
  ingestPaidMessage,
  broadcastToRenderers
} = vi.hoisted(() => ({
  shellBeep: vi.fn(),
  pollLiveChatMessages: vi.fn(),
  convertCurrency: vi.fn(),
  updateSessionResumeState: vi.fn(),
  ingestPaidMessage: vi.fn(),
  broadcastToRenderers: vi.fn()
}))

vi.mock('electron', () => ({
  shell: {
    beep: shellBeep
  }
}))

vi.mock('./youtube-api', () => ({
  pollLiveChatMessages
}))

vi.mock('./exchange-rate', () => ({
  convertCurrency
}))

vi.mock('./database', () => ({
  getQueries: () => ({
    updateSessionResumeState,
    ingestPaidMessage
  })
}))

vi.mock('./broadcast', () => ({
  broadcastToRenderers
}))

vi.mock('./preferences', () => ({
  getAppPreferences: () => ({
    soundEnabled: false
  })
}))

function createInsertedMessage(overrides: Partial<PaidMessage> = {}): PaidMessage {
  return {
    id: 'inserted-1',
    youtubeMessageId: 'yt-message-1',
    sessionId: 'session-1',
    donorChannelId: 'donor-1',
    donorDisplayName: 'Donor One',
    donorAvatarUrl: null,
    type: 'super_chat',
    amountMicros: 5_000_000,
    originalCurrency: 'USD',
    originalAmount: 5,
    convertedAmount: 6,
    convertedCurrency: 'EUR',
    amountDisplayString: '$5.00',
    messageText: 'Thanks!',
    stickerId: null,
    stickerAltText: null,
    tier: 1,
    receivedAt: '2026-03-30T12:00:00.000Z',
    state: 'unread',
    stateChangedAt: null,
    ...overrides
  }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('LiveChatPoller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T12:00:00.000Z'))
    pollLiveChatMessages.mockReset()
    convertCurrency.mockReset()
    updateSessionResumeState.mockReset()
    ingestPaidMessage.mockReset()
    broadcastToRenderers.mockReset()
    shellBeep.mockReset()
    convertCurrency.mockResolvedValue(6)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('filters paid events, persists resume state, and ignores unpaid messages', async () => {
    ingestPaidMessage.mockReturnValue(createInsertedMessage())
    pollLiveChatMessages.mockResolvedValue({
      nextPageToken: 'cursor-2',
      pollingIntervalMillis: 1500,
      messages: [
        {
          id: 'chat-1',
          snippet: {
            type: 'textMessageEvent',
            publishedAt: '2026-03-30T12:00:00.000Z'
          },
          authorDetails: {
            channelId: 'viewer-1',
            displayName: 'Viewer One'
          }
        },
        {
          id: 'paid-1',
          snippet: {
            type: 'superChatEvent',
            publishedAt: '2026-03-30T12:00:01.000Z',
            superChatDetails: {
              amountMicros: '5000000',
              currency: 'USD',
              amountDisplayString: '$5.00',
              userComment: 'Thanks!'
            }
          },
          authorDetails: {
            channelId: 'donor-1',
            displayName: 'Donor One',
            profileImageUrl: 'https://example.com/avatar.png'
          }
        },
        {
          id: 'end-1',
          snippet: {
            type: 'chatEndedEvent',
            publishedAt: '2026-03-30T12:00:02.000Z'
          },
          authorDetails: {
            channelId: 'system',
            displayName: 'System'
          }
        }
      ]
    })

    const onSessionEnded = vi.fn()
    const onDerivedStateChanged = vi.fn()
    const poller = new LiveChatPoller({
      liveChatId: 'chat-1',
      sessionId: 'session-1',
      preferredCurrency: 'EUR',
      onSessionEnded,
      onDerivedStateChanged
    })

    poller.start()
    await flushPromises()

    expect(updateSessionResumeState).toHaveBeenCalledWith(
      'session-1',
      'cursor-2',
      '2026-03-30T12:00:00.000Z',
      null
    )
    expect(ingestPaidMessage).toHaveBeenCalledTimes(1)
    expect(ingestPaidMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        youtubeMessageId: 'paid-1',
        type: 'super_chat',
        donorDisplayName: 'Donor One',
        convertedAmount: 6,
        convertedCurrency: 'EUR',
        messageText: 'Thanks!'
      })
    )
    expect(convertCurrency).toHaveBeenCalledWith(5, 'USD', 'EUR')
    expect(broadcastToRenderers).toHaveBeenCalledWith(
      'superchat:new',
      expect.objectContaining({ youtubeMessageId: 'yt-message-1' })
    )
    expect(onDerivedStateChanged).toHaveBeenCalledTimes(1)
    expect(onSessionEnded).toHaveBeenCalledTimes(1)
  })

  it('stores sticker metadata for sticker-only paid events', async () => {
    ingestPaidMessage.mockReturnValue(
      createInsertedMessage({
        type: 'super_sticker',
        messageText: null,
        stickerId: 'sticker-1',
        stickerAltText: 'Heart sticker'
      })
    )
    pollLiveChatMessages.mockResolvedValue({
      nextPageToken: null,
      pollingIntervalMillis: 1000,
      messages: [
        {
          id: 'sticker-yt-1',
          snippet: {
            type: 'superStickerEvent',
            publishedAt: '2026-03-30T12:00:01.000Z',
            superStickerDetails: {
              amountMicros: '7000000',
              currency: 'USD',
              amountDisplayString: '$7.00',
              tier: 3,
              altText: 'Heart sticker'
            },
            superStickerMetadata: {
              stickerId: 'sticker-1',
              altText: 'Heart sticker'
            }
          },
          authorDetails: {
            channelId: 'donor-2',
            displayName: 'Sticker Donor'
          }
        },
        {
          id: 'end-sticker',
          snippet: {
            type: 'chatEndedEvent',
            publishedAt: '2026-03-30T12:00:02.000Z'
          },
          authorDetails: {
            channelId: 'system',
            displayName: 'System'
          }
        }
      ]
    })

    const poller = new LiveChatPoller({
      liveChatId: 'chat-1',
      sessionId: 'session-1',
      preferredCurrency: 'EUR',
      onSessionEnded: vi.fn()
    })

    poller.start()
    await flushPromises()

    expect(ingestPaidMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        youtubeMessageId: 'sticker-yt-1',
        type: 'super_sticker',
        messageText: null,
        stickerId: 'sticker-1',
        stickerAltText: 'Heart sticker'
      })
    )
  })

  it('retries transient failures and resumes polling before exhaustion', async () => {
    ingestPaidMessage.mockReturnValue(createInsertedMessage())
    pollLiveChatMessages
      .mockRejectedValueOnce(new Error('network lost'))
      .mockResolvedValueOnce({
        nextPageToken: 'cursor-recovered',
        pollingIntervalMillis: 1000,
        messages: [
          {
            id: 'end-after-recover',
            snippet: {
              type: 'chatEndedEvent',
              publishedAt: '2026-03-30T12:00:03.000Z'
            },
            authorDetails: {
              channelId: 'system',
              displayName: 'System'
            }
          }
        ]
      })

    const onSessionEnded = vi.fn()
    const onFatalError = vi.fn()
    const poller = new LiveChatPoller({
      liveChatId: 'chat-1',
      sessionId: 'session-1',
      preferredCurrency: 'EUR',
      onSessionEnded,
      onFatalError
    })

    poller.start()
    await flushPromises()

    expect(broadcastToRenderers).toHaveBeenCalledWith('stream:status', {
      type: 'reconnecting',
      attempt: 1,
      sessionId: 'session-1'
    })
    expect(updateSessionResumeState).toHaveBeenLastCalledWith(
      'session-1',
      null,
      '2026-03-30T12:00:00.000Z',
      'network lost'
    )

    await vi.runOnlyPendingTimersAsync()
    await flushPromises()

    expect(updateSessionResumeState).toHaveBeenLastCalledWith(
      'session-1',
      'cursor-recovered',
      expect.any(String),
      null
    )
    expect(onFatalError).not.toHaveBeenCalled()
    expect(onSessionEnded).toHaveBeenCalledTimes(1)
  })

  it('treats terminal liveChatNotFound errors as natural end', async () => {
    pollLiveChatMessages.mockRejectedValue(new Error('404 liveChatNotFound'))

    const onSessionEnded = vi.fn()
    const onFatalError = vi.fn()
    const poller = new LiveChatPoller({
      liveChatId: 'chat-1',
      sessionId: 'session-1',
      preferredCurrency: 'USD',
      onSessionEnded,
      onFatalError
    })

    poller.start()
    await flushPromises()

    expect(onSessionEnded).toHaveBeenCalledTimes(1)
    expect(onFatalError).not.toHaveBeenCalled()
  })

  it('fails immediately on quota and auth errors without retrying', async () => {
    const quotaFatal = vi.fn()
    const quotaPoller = new LiveChatPoller({
      liveChatId: 'chat-1',
      sessionId: 'quota-session',
      preferredCurrency: 'USD',
      onFatalError: quotaFatal
    })
    pollLiveChatMessages.mockRejectedValueOnce(new Error('quotaExceeded'))

    quotaPoller.start()
    await flushPromises()

    expect(quotaFatal).toHaveBeenCalledWith('YouTube API quota exceeded. Monitoring paused.')

    const authFatal = vi.fn()
    const authPoller = new LiveChatPoller({
      liveChatId: 'chat-2',
      sessionId: 'auth-session',
      preferredCurrency: 'USD',
      onFatalError: authFatal
    })
    pollLiveChatMessages.mockRejectedValueOnce(new Error('401 Unauthorized'))

    authPoller.start()
    await flushPromises()

    expect(authFatal).toHaveBeenCalledWith('Authentication expired. Please sign in again.')
  })

  it('fails after reconnect exhaustion', async () => {
    pollLiveChatMessages.mockRejectedValue(new Error('socket hangup'))

    const onFatalError = vi.fn()
    const poller = new LiveChatPoller({
      liveChatId: 'chat-1',
      sessionId: 'session-1',
      preferredCurrency: 'USD',
      onFatalError
    })

    poller.start()
    await flushPromises()

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect(broadcastToRenderers).toHaveBeenCalledWith('stream:status', {
        type: 'reconnecting',
        attempt,
        sessionId: 'session-1'
      })
      await vi.runOnlyPendingTimersAsync()
      await flushPromises()
    }

    expect(onFatalError).toHaveBeenCalledWith('Connection lost after 5 retries.')
  })
})
