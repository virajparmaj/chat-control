// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResolvedLiveTarget, StreamSession } from '../../../shared/ipc-types'
import { useStreamStore } from './stream'

function createResolvedTarget(overrides: Partial<ResolvedLiveTarget> = {}): ResolvedLiveTarget {
  return {
    videoId: 'public12345a',
    liveChatId: 'public-chat-1',
    title: 'Public Live Stream',
    channelTitle: 'Public Channel',
    sourceMode: 'public_video',
    actualStartTime: '2026-03-30T12:00:00.000Z',
    thumbnailUrl: 'https://example.com/public.png',
    ...overrides
  }
}

function createSession(overrides: Partial<StreamSession> = {}): StreamSession {
  return {
    id: 'session-1',
    youtubeBroadcastId: 'broadcast-1',
    liveChatId: 'chat-1',
    title: 'Morning Stream',
    sourceMode: 'creator_broadcast',
    startedAt: '2026-03-30T12:00:00.000Z',
    endedAt: null,
    status: 'active',
    totalConverted: 0,
    convertedCurrency: 'USD',
    messageCount: 0,
    stickerCount: 0,
    resumePageToken: null,
    lastPolledAt: null,
    lastError: null,
    ...overrides
  }
}

function resetStreamStore(): void {
  useStreamStore.setState({
    broadcasts: [],
    resolvedTarget: null,
    activeSession: null,
    sessionSummary: null,
    streamStatus: null,
    loading: false,
    loadingContext: null,
    error: null,
    errorContext: null
  })
}

describe('useStreamStore', () => {
  beforeEach(() => {
    resetStreamStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores a resolved public target and clears target errors on success', async () => {
    const resolvedTarget = createResolvedTarget()
    window.api = {
      youtube: {
        getBroadcasts: vi.fn(),
        resolveTarget: vi.fn().mockResolvedValue(resolvedTarget),
        startSession: vi.fn(),
        startSessionFromTarget: vi.fn(),
        stopSession: vi.fn()
      }
    } as unknown as Window['api']

    await useStreamStore.getState().resolveTarget('https://youtu.be/public12345a')

    expect(window.api.youtube.resolveTarget).toHaveBeenCalledWith('https://youtu.be/public12345a')
    expect(useStreamStore.getState()).toMatchObject({
      resolvedTarget,
      error: null,
      errorContext: null,
      loading: false,
      loadingContext: null
    })
  })

  it('normalizes IPC wrapper text for target resolution failures', async () => {
    window.api = {
      youtube: {
        getBroadcasts: vi.fn(),
        resolveTarget: vi
          .fn()
          .mockRejectedValue(
            new Error(
              "Error invoking remote method 'youtube:resolve-target': Error: This video is not live right now."
            )
          ),
        startSession: vi.fn(),
        startSessionFromTarget: vi.fn(),
        stopSession: vi.fn()
      }
    } as unknown as Window['api']

    await useStreamStore.getState().resolveTarget('abc123def45')

    expect(useStreamStore.getState()).toMatchObject({
      resolvedTarget: null,
      error: 'This video is not live right now.',
      errorContext: 'target',
      loading: false,
      loadingContext: null
    })
  })

  it('starts a session from a resolved target and clears the preview state', async () => {
    const resolvedTarget = createResolvedTarget()
    const session = createSession({
      id: 'public-session',
      youtubeBroadcastId: resolvedTarget.videoId,
      liveChatId: resolvedTarget.liveChatId,
      title: resolvedTarget.title,
      sourceMode: 'public_video'
    })

    window.api = {
      youtube: {
        getBroadcasts: vi.fn(),
        resolveTarget: vi.fn(),
        startSession: vi.fn(),
        startSessionFromTarget: vi.fn().mockResolvedValue(session),
        stopSession: vi.fn()
      }
    } as unknown as Window['api']

    useStreamStore.setState({ resolvedTarget })

    await useStreamStore.getState().startSessionFromTarget(resolvedTarget)

    expect(window.api.youtube.startSessionFromTarget).toHaveBeenCalledWith(resolvedTarget)
    expect(useStreamStore.getState()).toMatchObject({
      activeSession: session,
      resolvedTarget: null,
      error: null,
      errorContext: null,
      loading: false,
      loadingContext: null
    })
  })
})
