import { v4 as uuidv4 } from 'uuid'
import type {
  ActiveSessionSnapshot,
  BroadcastInfo,
  ResolvedLiveTarget,
  SessionSummary,
  StreamSourceMode,
  StreamSession
} from '../../shared/ipc-types'
import { getQueries } from './database'
import { getAppPreferences } from './preferences'
import { getActiveBroadcasts, resolveLiveTargetByVideoId } from './youtube-api'
import { LiveChatPoller } from './live-chat-poller'
import { broadcastToRenderers } from './broadcast'
import {
  broadcastActiveSession,
  broadcastDonorsUpdated,
  broadcastSessionStats,
  broadcastSessionSummary
} from './runtime-events'
import { createOverlayWindow } from '../windows/overlay'

let activePoller: LiveChatPoller | null = null
let activeSessionId: string | null = null

function stopPoller(): void {
  if (activePoller) {
    activePoller.stop()
    activePoller = null
  }
}

function resolveSessionCurrency(session: StreamSession): string {
  return session.convertedCurrency ?? getAppPreferences().preferredCurrency
}

function normalizeSourceMode(sourceMode?: StreamSourceMode | null): StreamSourceMode {
  return sourceMode === 'public_video' ? 'public_video' : 'creator_broadcast'
}

async function findActiveBroadcast(session: StreamSession): Promise<BroadcastInfo | null> {
  const broadcasts = await getActiveBroadcasts()
  return (
    broadcasts.find((broadcast) => broadcast.id === session.youtubeBroadcastId) ??
    broadcasts.find((broadcast) => broadcast.liveChatId === session.liveChatId) ??
    null
  )
}

function broadcastDerivedState(sessionId: string): void {
  broadcastSessionStats(sessionId)
  broadcastDonorsUpdated(sessionId)
}

async function replaceExistingSessionIfNeeded(): Promise<void> {
  const queries = getQueries()
  const existing = queries.getActiveSession()
  if (!existing) return

  await finalizeSession(existing.id, {
    status: 'ended',
    emitStatus: false,
    emitSummary: false
  })
}

function createRuntimeSession(
  session: StreamSession,
  overrides: Partial<Pick<StreamSession, 'liveChatId' | 'title' | 'sourceMode'>> = {}
): StreamSession {
  return {
    ...session,
    ...overrides,
    sourceMode: normalizeSourceMode(overrides.sourceMode ?? session.sourceMode)
  }
}

async function createAndStartSession(target: {
  youtubeBroadcastId: string
  liveChatId: string
  title: string
  sourceMode: StreamSourceMode
}): Promise<StreamSession> {
  await replaceExistingSessionIfNeeded()

  const preferences = getAppPreferences()
  const queries = getQueries()
  const session = queries.createSession({
    id: uuidv4(),
    youtubeBroadcastId: target.youtubeBroadcastId,
    liveChatId: target.liveChatId,
    title: target.title,
    sourceMode: target.sourceMode,
    convertedCurrency: preferences.preferredCurrency
  })

  createOverlayWindow()
  broadcastActiveSession()
  broadcastDerivedState(session.id)
  attachPoller(session).start()

  return session
}

async function finalizeSession(
  sessionId: string,
  options: {
    status: 'ended' | 'error'
    errorMessage?: string
    emitStatus?: boolean
    emitSummary?: boolean
  }
): Promise<SessionSummary | null> {
  if (activeSessionId === sessionId) {
    stopPoller()
    activeSessionId = null
  }

  const queries = getQueries()
  const session =
    options.status === 'ended'
      ? queries.endSession(sessionId)
      : queries.markSessionError(
          sessionId,
          options.errorMessage ?? 'Monitoring stopped unexpectedly'
        )

  broadcastActiveSession()

  if (options.status === 'error' && options.emitStatus && session) {
    broadcastToRenderers('stream:status', {
      type: 'error',
      sessionId,
      message: options.errorMessage ?? session.lastError ?? 'Monitoring stopped unexpectedly.'
    })
  }

  if (options.status === 'ended' && options.emitStatus) {
    broadcastToRenderers('stream:status', { type: 'ended', sessionId })
  }

  if (options.emitSummary) {
    broadcastSessionSummary(sessionId)
  }

  return queries.getSessionSummary(sessionId)
}

function attachPoller(session: StreamSession): LiveChatPoller {
  stopPoller()
  activeSessionId = session.id

  const poller = new LiveChatPoller({
    liveChatId: session.liveChatId ?? '',
    sessionId: session.id,
    preferredCurrency: resolveSessionCurrency(session),
    initialPageToken: session.resumePageToken,
    onSessionEnded: async () => {
      await finalizeSession(session.id, {
        status: 'ended',
        emitStatus: true,
        emitSummary: true
      })
    },
    onFatalError: async (message) => {
      await finalizeSession(session.id, {
        status: 'error',
        errorMessage: message,
        emitStatus: true,
        emitSummary: false
      })
    },
    onDerivedStateChanged: () => {
      broadcastDerivedState(session.id)
    }
  })

  activePoller = poller
  return poller
}

async function resumeSession(session: StreamSession): Promise<boolean> {
  let runtimeSession = createRuntimeSession(session)
  const sourceMode = normalizeSourceMode(session.sourceMode)

  if (sourceMode === 'creator_broadcast') {
    if (!session.liveChatId) {
      await finalizeSession(session.id, {
        status: 'error',
        errorMessage: 'Stored session is missing a live chat identifier.',
        emitStatus: false,
        emitSummary: false
      })
      return false
    }

    const broadcast = await findActiveBroadcast(session)
    if (!broadcast) {
      await finalizeSession(session.id, {
        status: 'error',
        errorMessage: 'Stored live session is no longer active on YouTube.',
        emitStatus: false,
        emitSummary: false
      })
      return false
    }

    runtimeSession = createRuntimeSession(session, {
      liveChatId: session.liveChatId ?? broadcast.liveChatId,
      title: session.title ?? broadcast.title,
      sourceMode
    })
  } else {
    try {
      const target = await resolveLiveTargetByVideoId(session.youtubeBroadcastId)
      runtimeSession = createRuntimeSession(session, {
        liveChatId: session.liveChatId ?? target.liveChatId,
        title: session.title ?? target.title,
        sourceMode
      })
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to recover the previous monitoring session.'
      await finalizeSession(session.id, {
        status: 'error',
        errorMessage: message,
        emitStatus: false,
        emitSummary: false
      })
      return false
    }
  }

  createOverlayWindow()
  attachPoller(runtimeSession).start()
  broadcastActiveSession()
  broadcastDerivedState(runtimeSession.id)
  return true
}

export async function initializeSessionManager(): Promise<void> {
  const queries = getQueries()
  const activeSessions = queries.listActiveSessions()
  if (activeSessions.length === 0) return

  const [latest, ...staleSessions] = activeSessions
  for (const stale of staleSessions) {
    queries.markSessionError(stale.id, 'Superseded during startup recovery.')
  }

  try {
    await resumeSession(latest)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to recover the previous monitoring session.'
    await finalizeSession(latest.id, {
      status: 'error',
      errorMessage: message,
      emitStatus: false,
      emitSummary: false
    })
  }
}

export async function startMonitoringSession(broadcastId: string): Promise<StreamSession> {
  const broadcasts = await getActiveBroadcasts()
  const broadcast = broadcasts.find((candidate) => candidate.id === broadcastId)
  if (!broadcast) {
    throw new Error('Broadcast not found or no longer active')
  }

  return createAndStartSession({
    youtubeBroadcastId: broadcast.id,
    liveChatId: broadcast.liveChatId,
    title: broadcast.title,
    sourceMode: 'creator_broadcast'
  })
}

export async function startMonitoringSessionFromTarget(
  target: ResolvedLiveTarget
): Promise<StreamSession> {
  if (target.sourceMode !== 'public_video') {
    throw new Error('Only resolved public livestream targets can be monitored from this flow.')
  }

  const resolvedTarget = await resolveLiveTargetByVideoId(target.videoId)
  return createAndStartSession({
    youtubeBroadcastId: resolvedTarget.videoId,
    liveChatId: resolvedTarget.liveChatId,
    title: resolvedTarget.title,
    sourceMode: resolvedTarget.sourceMode
  })
}

export async function stopMonitoringSession(): Promise<SessionSummary | null> {
  const session = getQueries().getActiveSession()
  if (!session) return null

  return finalizeSession(session.id, {
    status: 'ended',
    emitStatus: true,
    emitSummary: true
  })
}

export function getActiveSessionSnapshot(): ActiveSessionSnapshot | null {
  return getQueries().getActiveSessionSnapshot(getAppPreferences().defaultSort)
}

export function shutdownSessionManager(): void {
  stopPoller()
  activeSessionId = null
}
