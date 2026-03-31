import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResolvedLiveTarget } from '../../shared/ipc-types'

const {
  handlers,
  ipcHandle,
  getActiveBroadcasts,
  resolveLiveTarget,
  startMonitoringSession,
  startMonitoringSessionFromTarget,
  stopMonitoringSession,
  getActiveSessionSnapshot
} = vi.hoisted(() => {
  const registeredHandlers = new Map<string, (...args: unknown[]) => unknown>()

  return {
    handlers: registeredHandlers,
    ipcHandle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      registeredHandlers.set(channel, handler)
    }),
    getActiveBroadcasts: vi.fn(),
    resolveLiveTarget: vi.fn(),
    startMonitoringSession: vi.fn(),
    startMonitoringSessionFromTarget: vi.fn(),
    stopMonitoringSession: vi.fn(),
    getActiveSessionSnapshot: vi.fn()
  }
})

vi.mock('electron', () => ({
  ipcMain: {
    handle: ipcHandle
  }
}))

vi.mock('../services/youtube-api', () => ({
  getActiveBroadcasts,
  resolveLiveTarget
}))

vi.mock('../services/session-manager', () => ({
  getActiveSessionSnapshot,
  startMonitoringSession,
  startMonitoringSessionFromTarget,
  stopMonitoringSession
}))

async function loadYouTubeIpc(): Promise<typeof import('./youtube.ipc')> {
  return import('./youtube.ipc')
}

function createResolvedTarget(overrides: Partial<ResolvedLiveTarget> = {}): ResolvedLiveTarget {
  return {
    videoId: 'abc123def45',
    liveChatId: 'public-chat-1',
    title: 'Public Stream',
    channelTitle: 'Public Channel',
    sourceMode: 'public_video',
    actualStartTime: '2026-03-30T12:00:00.000Z',
    thumbnailUrl: 'https://example.com/public.png',
    ...overrides
  }
}

describe('registerYouTubeHandlers', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    handlers.clear()
    const { registerYouTubeHandlers } = await loadYouTubeIpc()
    registerYouTubeHandlers()
  })

  it('registers the legacy creator handlers and new target handlers', () => {
    expect(ipcHandle).toHaveBeenCalledTimes(6)
    expect(handlers.has('youtube:get-broadcasts')).toBe(true)
    expect(handlers.has('youtube:resolve-target')).toBe(true)
    expect(handlers.has('youtube:start-session')).toBe(true)
    expect(handlers.has('youtube:start-session-from-target')).toBe(true)
    expect(handlers.has('youtube:stop-session')).toBe(true)
    expect(handlers.has('sessions:get-active')).toBe(true)
  })

  it('passes resolved targets through the new resolve and start handlers', async () => {
    const resolvedTarget = createResolvedTarget()
    const createdSession = {
      id: 'session-1',
      youtubeBroadcastId: 'abc123def45',
      liveChatId: 'public-chat-1',
      title: 'Public Stream',
      sourceMode: 'public_video',
      startedAt: '2026-03-30T12:00:00.000Z',
      endedAt: null,
      status: 'active',
      totalConverted: 0,
      convertedCurrency: 'USD',
      messageCount: 0,
      stickerCount: 0,
      resumePageToken: null,
      lastPolledAt: null,
      lastError: null
    }

    resolveLiveTarget.mockResolvedValue(resolvedTarget)
    startMonitoringSessionFromTarget.mockResolvedValue(createdSession)

    const resolveHandler = handlers.get('youtube:resolve-target')
    const startFromTargetHandler = handlers.get('youtube:start-session-from-target')

    await expect(resolveHandler?.({}, 'https://youtu.be/abc123def45')).resolves.toEqual(
      resolvedTarget
    )
    await expect(startFromTargetHandler?.({}, resolvedTarget)).resolves.toEqual(createdSession)
    expect(resolveLiveTarget).toHaveBeenCalledWith('https://youtu.be/abc123def45')
    expect(startMonitoringSessionFromTarget).toHaveBeenCalledWith(resolvedTarget)
  })

  it('propagates resolver errors without altering their messages', async () => {
    resolveLiveTarget.mockRejectedValue(new Error('This video is not live right now.'))

    const resolveHandler = handlers.get('youtube:resolve-target')

    await expect(resolveHandler?.({}, 'abc123def45')).rejects.toThrow(
      'This video is not live right now.'
    )
  })
})
