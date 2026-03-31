import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResolvedLiveTarget, SessionSummary, StreamSession } from '../../shared/ipc-types'

const {
  getQueries,
  getAppPreferences,
  getActiveBroadcasts,
  resolveLiveTargetByVideoId,
  broadcastToRenderers,
  broadcastActiveSession,
  broadcastDonorsUpdated,
  broadcastSessionStats,
  broadcastSessionSummary,
  createOverlayWindow,
  pollerInstances,
  FakeLiveChatPoller
} = vi.hoisted(() => {
  const pollers: Array<{
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    options: Record<string, unknown>
  }> = []

  class HoistedFakeLiveChatPoller {
    start = vi.fn()
    stop = vi.fn()
    options: Record<string, unknown>

    constructor(options: Record<string, unknown>) {
      this.options = options
      pollers.push(this)
    }
  }

  return {
    getQueries: vi.fn(),
    getAppPreferences: vi.fn(),
    getActiveBroadcasts: vi.fn(),
    resolveLiveTargetByVideoId: vi.fn(),
    broadcastToRenderers: vi.fn(),
    broadcastActiveSession: vi.fn(),
    broadcastDonorsUpdated: vi.fn(),
    broadcastSessionStats: vi.fn(),
    broadcastSessionSummary: vi.fn(),
    createOverlayWindow: vi.fn(),
    pollerInstances: pollers,
    FakeLiveChatPoller: HoistedFakeLiveChatPoller
  }
})

vi.mock('./database', () => ({
  getQueries
}))

vi.mock('./preferences', () => ({
  getAppPreferences
}))

vi.mock('./youtube-api', () => ({
  getActiveBroadcasts,
  resolveLiveTargetByVideoId
}))

vi.mock('./broadcast', () => ({
  broadcastToRenderers
}))

vi.mock('./runtime-events', () => ({
  broadcastActiveSession,
  broadcastDonorsUpdated,
  broadcastSessionStats,
  broadcastSessionSummary
}))

vi.mock('../windows/overlay', () => ({
  createOverlayWindow
}))

vi.mock('./live-chat-poller', () => ({
  LiveChatPoller: FakeLiveChatPoller
}))

function createSession(overrides: Partial<StreamSession> = {}): StreamSession {
  return {
    id: 'session-1',
    youtubeBroadcastId: 'broadcast-1',
    liveChatId: 'chat-1',
    title: 'Stream One',
    sourceMode: 'creator_broadcast',
    startedAt: '2026-03-30T12:00:00.000Z',
    endedAt: null,
    status: 'active',
    totalConverted: 0,
    convertedCurrency: 'USD',
    messageCount: 0,
    stickerCount: 0,
    resumePageToken: 'cursor-1',
    lastPolledAt: null,
    lastError: null,
    ...overrides
  }
}

function createResolvedTarget(overrides: Partial<ResolvedLiveTarget> = {}): ResolvedLiveTarget {
  return {
    videoId: 'public12345a',
    liveChatId: 'public-chat-1',
    title: 'Public Stream',
    channelTitle: 'Public Channel',
    sourceMode: 'public_video',
    actualStartTime: '2026-03-30T12:00:00.000Z',
    thumbnailUrl: 'https://example.com/public.png',
    ...overrides
  }
}

interface QueriesMock {
  listActiveSessions: ReturnType<typeof vi.fn>
  markSessionError: ReturnType<typeof vi.fn>
  getActiveSession: ReturnType<typeof vi.fn>
  endSession: ReturnType<typeof vi.fn>
  createSession: ReturnType<typeof vi.fn>
  getSessionSummary: ReturnType<typeof vi.fn>
  getActiveSessionSnapshot: ReturnType<typeof vi.fn>
}

function createQueriesMock(overrides: Partial<QueriesMock> = {}): QueriesMock {
  return {
    listActiveSessions: vi.fn().mockReturnValue([]),
    markSessionError: vi.fn(),
    getActiveSession: vi.fn().mockReturnValue(null),
    endSession: vi.fn(),
    createSession: vi.fn(),
    getSessionSummary: vi.fn().mockReturnValue(null),
    getActiveSessionSnapshot: vi.fn().mockReturnValue(null),
    ...overrides
  }
}

async function loadSessionManager(): Promise<typeof import('./session-manager')> {
  return import('./session-manager')
}

describe('session-manager', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    pollerInstances.length = 0
    resolveLiveTargetByVideoId.mockReset()
    getAppPreferences.mockReturnValue({
      preferredCurrency: 'USD',
      defaultSort: 'latest'
    })
  })

  it('starts a new session after finalizing any existing active session', async () => {
    const existingSession = createSession({ id: 'existing-session', title: 'Existing Stream' })
    const newSession = createSession({
      id: 'new-session',
      title: 'New Stream',
      resumePageToken: null
    })
    const queries = createQueriesMock({
      getActiveSession: vi.fn().mockReturnValue(existingSession),
      endSession: vi.fn().mockReturnValue({
        ...existingSession,
        status: 'ended',
        endedAt: '2026-03-30T12:10:00.000Z',
        resumePageToken: null
      }),
      createSession: vi.fn().mockReturnValue(newSession),
      getSessionSummary: vi.fn().mockReturnValue({
        ...existingSession,
        status: 'ended',
        savedCount: 0,
        averageDonation: 0,
        highestDonor: null,
        topDonors: []
      } satisfies SessionSummary)
    })
    getQueries.mockReturnValue(queries)
    getActiveBroadcasts.mockResolvedValue([
      {
        id: 'broadcast-1',
        title: 'New Stream',
        status: 'live',
        liveChatId: 'chat-1'
      }
    ])

    const sessionManager = await loadSessionManager()
    const result = await sessionManager.startMonitoringSession('broadcast-1')

    expect(queries.endSession).toHaveBeenCalledWith('existing-session')
    expect(queries.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        youtubeBroadcastId: 'broadcast-1',
        liveChatId: 'chat-1',
        sourceMode: 'creator_broadcast',
        convertedCurrency: 'USD'
      })
    )
    expect(createOverlayWindow).toHaveBeenCalledTimes(1)
    expect(broadcastActiveSession).toHaveBeenCalled()
    expect(broadcastSessionStats).toHaveBeenCalledWith('new-session')
    expect(broadcastDonorsUpdated).toHaveBeenCalledWith('new-session')
    expect(pollerInstances).toHaveLength(1)
    expect(pollerInstances[0].start).toHaveBeenCalledTimes(1)
    expect(result).toBe(newSession)
  })

  it('recovers the latest active session and marks older duplicates as superseded', async () => {
    const latest = createSession({ id: 'latest-session', resumePageToken: 'cursor-latest' })
    const stale = createSession({ id: 'stale-session', startedAt: '2026-03-30T11:00:00.000Z' })
    const queries = createQueriesMock({
      listActiveSessions: vi.fn().mockReturnValue([latest, stale]),
      markSessionError: vi.fn()
    })
    getQueries.mockReturnValue(queries)
    getActiveBroadcasts.mockResolvedValue([
      {
        id: 'broadcast-1',
        title: 'Recovered Stream',
        status: 'live',
        liveChatId: 'chat-1'
      }
    ])

    const sessionManager = await loadSessionManager()
    await sessionManager.initializeSessionManager()

    expect(queries.markSessionError).toHaveBeenCalledWith(
      'stale-session',
      'Superseded during startup recovery.'
    )
    expect(createOverlayWindow).toHaveBeenCalledTimes(1)
    expect(broadcastActiveSession).toHaveBeenCalled()
    expect(broadcastSessionStats).toHaveBeenCalledWith('latest-session')
    expect(broadcastDonorsUpdated).toHaveBeenCalledWith('latest-session')
    expect(pollerInstances).toHaveLength(1)
    expect(pollerInstances[0].options).toMatchObject({
      sessionId: 'latest-session',
      liveChatId: 'chat-1',
      initialPageToken: 'cursor-latest',
      preferredCurrency: 'USD'
    })
    expect(pollerInstances[0].start).toHaveBeenCalledTimes(1)
  })

  it('starts a public-target session only after re-resolving the target', async () => {
    const existingSession = createSession({ id: 'existing-session', title: 'Existing Stream' })
    const newSession = createSession({
      id: 'new-public-session',
      youtubeBroadcastId: 'public12345a',
      liveChatId: 'public-chat-1',
      title: 'Public Stream',
      sourceMode: 'public_video',
      resumePageToken: null
    })
    const callSequence: string[] = []
    const queries = createQueriesMock({
      getActiveSession: vi.fn(() => {
        callSequence.push('getActiveSession')
        return existingSession
      }),
      endSession: vi.fn((id: string) => {
        callSequence.push(`endSession:${id}`)
        return {
          ...existingSession,
          status: 'ended',
          endedAt: '2026-03-30T12:10:00.000Z',
          resumePageToken: null
        }
      }),
      createSession: vi.fn((payload: Record<string, unknown>) => {
        callSequence.push(`createSession:${payload.youtubeBroadcastId as string}`)
        return newSession
      })
    })
    getQueries.mockReturnValue(queries)
    resolveLiveTargetByVideoId.mockImplementation(async (videoId: string) => {
      callSequence.push(`resolve:${videoId}`)
      return createResolvedTarget({ videoId })
    })

    const sessionManager = await loadSessionManager()
    const result = await sessionManager.startMonitoringSessionFromTarget(createResolvedTarget())

    expect(callSequence).toEqual([
      'resolve:public12345a',
      'getActiveSession',
      'endSession:existing-session',
      'createSession:public12345a'
    ])
    expect(queries.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        youtubeBroadcastId: 'public12345a',
        liveChatId: 'public-chat-1',
        title: 'Public Stream',
        sourceMode: 'public_video',
        convertedCurrency: 'USD'
      })
    )
    expect(createOverlayWindow).toHaveBeenCalledTimes(1)
    expect(pollerInstances[0].start).toHaveBeenCalledTimes(1)
    expect(result).toBe(newSession)
  })

  it('recovers an active public-video session by re-resolving the stored target', async () => {
    const latest = createSession({
      id: 'public-session',
      youtubeBroadcastId: 'public12345a',
      liveChatId: 'public-chat-1',
      title: 'Public Stream',
      sourceMode: 'public_video',
      resumePageToken: 'cursor-public'
    })
    const queries = createQueriesMock({
      listActiveSessions: vi.fn().mockReturnValue([latest]),
      markSessionError: vi.fn()
    })
    getQueries.mockReturnValue(queries)
    resolveLiveTargetByVideoId.mockResolvedValue(createResolvedTarget())

    const sessionManager = await loadSessionManager()
    await sessionManager.initializeSessionManager()

    expect(resolveLiveTargetByVideoId).toHaveBeenCalledWith('public12345a')
    expect(createOverlayWindow).toHaveBeenCalledTimes(1)
    expect(pollerInstances).toHaveLength(1)
    expect(pollerInstances[0].options).toMatchObject({
      sessionId: 'public-session',
      liveChatId: 'public-chat-1',
      initialPageToken: 'cursor-public',
      preferredCurrency: 'USD'
    })
  })

  it('marks public-video recovery as errored when the target is no longer live', async () => {
    const latest = createSession({
      id: 'public-session',
      youtubeBroadcastId: 'public12345a',
      liveChatId: 'public-chat-1',
      sourceMode: 'public_video'
    })
    const queries = createQueriesMock({
      listActiveSessions: vi.fn().mockReturnValue([latest]),
      markSessionError: vi.fn().mockReturnValue({
        ...latest,
        status: 'error',
        endedAt: '2026-03-30T12:05:00.000Z',
        lastError: 'This video is not live right now.',
        resumePageToken: null
      })
    })
    getQueries.mockReturnValue(queries)
    resolveLiveTargetByVideoId.mockRejectedValue(new Error('This video is not live right now.'))

    const sessionManager = await loadSessionManager()
    await sessionManager.initializeSessionManager()

    expect(queries.markSessionError).toHaveBeenCalledWith(
      'public-session',
      'This video is not live right now.'
    )
    expect(createOverlayWindow).not.toHaveBeenCalled()
    expect(pollerInstances).toHaveLength(0)
  })

  it('treats legacy sessions with null source mode as creator-broadcast sessions during recovery', async () => {
    const latest = createSession({
      id: 'legacy-session',
      sourceMode: null
    })
    const queries = createQueriesMock({
      listActiveSessions: vi.fn().mockReturnValue([latest]),
      markSessionError: vi.fn()
    })
    getQueries.mockReturnValue(queries)
    getActiveBroadcasts.mockResolvedValue([
      {
        id: 'broadcast-1',
        title: 'Recovered Stream',
        status: 'live',
        liveChatId: 'chat-1'
      }
    ])

    const sessionManager = await loadSessionManager()
    await sessionManager.initializeSessionManager()

    expect(getActiveBroadcasts).toHaveBeenCalledTimes(1)
    expect(resolveLiveTargetByVideoId).not.toHaveBeenCalled()
    expect(pollerInstances).toHaveLength(1)
  })

  it('marks recovery as error when the stored broadcast is no longer live', async () => {
    const latest = createSession({ id: 'orphaned-session' })
    const queries = createQueriesMock({
      listActiveSessions: vi.fn().mockReturnValue([latest]),
      markSessionError: vi.fn().mockReturnValue({
        ...latest,
        status: 'error',
        endedAt: '2026-03-30T12:05:00.000Z',
        lastError: 'Stored live session is no longer active on YouTube.',
        resumePageToken: null
      })
    })
    getQueries.mockReturnValue(queries)
    getActiveBroadcasts.mockResolvedValue([])

    const sessionManager = await loadSessionManager()
    await sessionManager.initializeSessionManager()

    expect(queries.markSessionError).toHaveBeenCalledWith(
      'orphaned-session',
      'Stored live session is no longer active on YouTube.'
    )
    expect(createOverlayWindow).not.toHaveBeenCalled()
    expect(broadcastActiveSession).toHaveBeenCalled()
    expect(pollerInstances).toHaveLength(0)
  })
})
