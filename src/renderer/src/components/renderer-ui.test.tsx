// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardShell } from './layout/DashboardShell'
import { StreamInfo } from './dashboard/StreamInfo'
import { OverlayFeed } from './overlay/OverlayFeed'
import { SavedItems } from './dashboard/SavedItems'
import { SessionHistory } from './dashboard/SessionHistory'
import { DonorLeaderboard } from './leaderboard/DonorLeaderboard'
import { StreamSummary } from './summary/StreamSummary'
import { useRuntimeSync } from '../hooks/useRuntimeSync'
import { useAuthStore } from '../store/auth'
import { useSettingsStore } from '../store/settings'
import { useStreamStore } from '../store/stream'
import { EMPTY_STATS, useSuperchatStore } from '../store/superchats'
import type {
  ActiveSessionSnapshot,
  AppPreferences,
  DonorAggregate,
  PaidMessage,
  ResolvedLiveTarget,
  SessionSummary,
  StreamStatusEvent,
  StreamSession
} from '../../../shared/ipc-types'
import { DEFAULT_PREFERENCES } from '../../../shared/ipc-types'

function createMessage(id: string, overrides: Partial<PaidMessage> = {}): PaidMessage {
  return {
    id,
    youtubeMessageId: `yt-${id}`,
    sessionId: 'session-1',
    donorChannelId: `donor-${id}`,
    donorDisplayName: `Donor ${id}`,
    donorAvatarUrl: null,
    type: 'super_chat',
    amountMicros: 5_000_000,
    originalCurrency: 'USD',
    originalAmount: 5,
    convertedAmount: 5,
    convertedCurrency: 'USD',
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
    totalConverted: 35,
    convertedCurrency: 'USD',
    messageCount: 2,
    stickerCount: 0,
    resumePageToken: 'cursor-1',
    lastPolledAt: '2026-03-30T12:02:00.000Z',
    lastError: null,
    ...overrides
  }
}

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

function createDonor(
  id: string,
  totalConverted: number,
  overrides: Partial<DonorAggregate> = {}
): DonorAggregate {
  return {
    channelId: `donor-${id}`,
    sessionId: 'session-1',
    displayName: `Donor ${id}`,
    avatarUrl: null,
    totalConverted,
    messageCount: 1,
    firstSeenAt: '2026-03-30T12:00:00.000Z',
    lastSeenAt: '2026-03-30T12:01:00.000Z',
    ...overrides
  }
}

function createSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  const highestDonor = createDonor('leader', 50, { displayName: 'Top Donor' })
  return {
    ...createSession({
      status: 'ended',
      endedAt: '2026-03-30T13:00:00.000Z',
      totalConverted: 75,
      messageCount: 3,
      stickerCount: 1
    }),
    highestDonor,
    topDonors: [highestDonor, createDonor('runner-up', 25, { displayName: 'Runner Up' })],
    savedCount: 1,
    averageDonation: 25,
    ...overrides
  }
}

function createSnapshot(overrides: Partial<ActiveSessionSnapshot> = {}): ActiveSessionSnapshot {
  const session = createSession()
  const donors = [createDonor('leader', 30)]
  return {
    session,
    messages: [
      createMessage('a', { convertedAmount: 5 }),
      createMessage('b', { convertedAmount: 30, receivedAt: '2026-03-30T12:03:00.000Z' })
    ],
    donors,
    stats: {
      ...EMPTY_STATS,
      totalConverted: 35,
      messageCount: 2,
      unreadCount: 2,
      averageDonation: 17.5,
      convertedCurrency: 'USD'
    },
    ...overrides
  }
}

type ListenerKey =
  | 'sessionActive'
  | 'newSuperchat'
  | 'superchatUpdated'
  | 'donorsUpdated'
  | 'sessionStats'
  | 'streamStatus'
  | 'sessionSummary'
  | 'settingsChanged'

type MockApi = Window['api'] & {
  __emit: (event: ListenerKey, payload: unknown) => void
}

type MockApiOverrides = {
  [K in keyof Window['api']]?: Partial<Window['api'][K]>
}

function createMockApi(overrides: MockApiOverrides = {}): MockApi {
  const listeners: Record<ListenerKey, Set<(payload: unknown) => void>> = {
    sessionActive: new Set(),
    newSuperchat: new Set(),
    superchatUpdated: new Set(),
    donorsUpdated: new Set(),
    sessionStats: new Set(),
    streamStatus: new Set(),
    sessionSummary: new Set(),
    settingsChanged: new Set()
  }

  const onFactory =
    <T,>(key: ListenerKey) =>
    (callback: (payload: T) => void): (() => void) => {
      const wrapped = callback as (payload: unknown) => void
      listeners[key].add(wrapped)
      return () => listeners[key].delete(wrapped)
    }

  const api: MockApi = {
    auth: {
      login: vi.fn().mockResolvedValue({
        authenticated: true,
        oauthConfigured: true,
        displayName: 'Creator'
      }),
      logout: vi.fn().mockResolvedValue(undefined),
      status: vi.fn().mockResolvedValue({ authenticated: false, oauthConfigured: true })
    },
    youtube: {
      getBroadcasts: vi.fn().mockResolvedValue([]),
      resolveTarget: vi.fn().mockResolvedValue(createResolvedTarget()),
      startSession: vi.fn(),
      startSessionFromTarget: vi.fn(),
      stopSession: vi.fn().mockResolvedValue(null)
    },
    superchats: {
      list: vi.fn().mockResolvedValue([]),
      markRead: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(null),
      undo: vi.fn().mockResolvedValue(null)
    },
    donors: {
      list: vi.fn().mockResolvedValue([])
    },
    sessions: {
      list: vi.fn().mockResolvedValue([]),
      summary: vi.fn().mockResolvedValue(null),
      getActive: vi.fn().mockResolvedValue(null)
    },
    settings: {
      get: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES),
      update: vi.fn().mockImplementation(async (patch: Partial<AppPreferences>) => ({
        ...DEFAULT_PREFERENCES,
        ...patch
      }))
    },
    window: {
      toggleOverlay: vi.fn().mockResolvedValue(undefined),
      lockOverlay: vi.fn().mockResolvedValue(undefined)
    },
    on: {
      sessionActive: onFactory<ActiveSessionSnapshot | null>('sessionActive'),
      newSuperchat: onFactory<PaidMessage>('newSuperchat'),
      superchatUpdated: onFactory<PaidMessage>('superchatUpdated'),
      donorsUpdated: onFactory<DonorAggregate[]>('donorsUpdated'),
      sessionStats: onFactory<typeof EMPTY_STATS>('sessionStats'),
      streamStatus: onFactory<StreamStatusEvent>('streamStatus'),
      sessionSummary: onFactory<SessionSummary>('sessionSummary'),
      settingsChanged: onFactory<AppPreferences>('settingsChanged')
    },
    __emit: (event, payload) => {
      for (const listener of listeners[event]) {
        listener(payload)
      }
    }
  }

  return {
    ...api,
    auth: { ...api.auth, ...overrides.auth },
    youtube: { ...api.youtube, ...overrides.youtube },
    superchats: { ...api.superchats, ...overrides.superchats },
    donors: { ...api.donors, ...overrides.donors },
    sessions: { ...api.sessions, ...overrides.sessions },
    settings: { ...api.settings, ...overrides.settings },
    window: { ...api.window, ...overrides.window },
    on: { ...api.on, ...overrides.on },
    __emit: api.__emit
  }
}

function resetStores(): void {
  useAuthStore.setState({
    status: { authenticated: false, oauthConfigured: true },
    loading: true,
    error: null
  })
  useSettingsStore.setState({
    preferences: DEFAULT_PREFERENCES,
    loading: false
  })
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
  useSuperchatStore.getState().clear()
  useSuperchatStore.setState({
    stats: EMPTY_STATS,
    sort: 'latest'
  })
}

function RuntimeSyncHarness(): React.JSX.Element {
  useRuntimeSync()
  const activeSession = useStreamStore((state) => state.activeSession)
  const messages = useSuperchatStore((state) => state.messages)
  const sort = useSuperchatStore((state) => state.sort)

  return (
    <div>
      <span data-testid="session-title">{activeSession?.title ?? 'none'}</span>
      <span data-testid="message-count">{String(messages.length)}</span>
      <span data-testid="sort">{sort}</span>
    </div>
  )
}

describe('renderer UI layer', () => {
  beforeEach(() => {
    resetStores()
    window.location.hash = ''
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the signed-out dashboard bootstrap state', async () => {
    window.api = createMockApi({
      auth: {
        login: vi.fn(),
        logout: vi.fn(),
        status: vi.fn().mockResolvedValue({ authenticated: false, oauthConfigured: true })
      },
      settings: {
        get: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES),
        update: vi.fn()
      },
      sessions: {
        list: vi.fn(),
        summary: vi.fn(),
        getActive: vi.fn().mockResolvedValue(null)
      }
    }) as Window['api']

    render(<DashboardShell />)

    expect(await screen.findByText('Sign in with YouTube')).toBeInTheDocument()
    expect(screen.getByText('Uses official YouTube API only')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with youtube/i })).toBeEnabled()
  })

  it('disables sign-in and shows setup guidance when OAuth is not configured', async () => {
    window.api = createMockApi({
      auth: {
        login: vi.fn(),
        logout: vi.fn(),
        status: vi.fn().mockResolvedValue({
          authenticated: false,
          oauthConfigured: false,
          configurationError:
            'OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then relaunch ChatControl. For local development, you can place them in .env.'
        })
      }
    }) as Window['api']

    render(<DashboardShell />)

    expect(await screen.findByText('OAuth setup required')).toBeInTheDocument()
    expect(screen.getByText(/GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with youtube/i })).toBeDisabled()
  })

  it('shows a cleaned login error without the Electron IPC wrapper text', async () => {
    window.api = createMockApi({
      auth: {
        login: vi
          .fn()
          .mockRejectedValue(
            new Error("Error invoking remote method 'auth:login': Error: OAuth flow timed out")
          ),
        logout: vi.fn(),
        status: vi.fn().mockResolvedValue({ authenticated: false, oauthConfigured: true })
      }
    }) as Window['api']

    render(<DashboardShell />)

    await userEvent.click(await screen.findByRole('button', { name: /sign in with youtube/i }))

    expect(await screen.findByText('OAuth flow timed out')).toBeInTheDocument()
    expect(screen.queryByText(/Error invoking remote method/i)).not.toBeInTheDocument()
  })

  it('shows the no-stream empty state for an authenticated account', async () => {
    useAuthStore.setState({
      status: { authenticated: true, oauthConfigured: true, displayName: 'Creator' },
      loading: false,
      error: null
    })

    window.api = createMockApi({
      youtube: {
        getBroadcasts: vi.fn().mockResolvedValue([]),
        startSession: vi.fn(),
        stopSession: vi.fn()
      }
    }) as Window['api']

    render(<StreamInfo />)

    expect(await screen.findByText('No active livestreams found')).toBeInTheDocument()
    expect(screen.getByText('My Active Streams')).toBeInTheDocument()
    expect(screen.getByText('Monitor by URL/Video ID')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Start a stream on YouTube, then refresh.')).toBeInTheDocument()
  })

  it('resolves and starts monitoring a public livestream from the beta flow', async () => {
    useAuthStore.setState({
      status: { authenticated: true, oauthConfigured: true, displayName: 'Creator' },
      loading: false,
      error: null
    })

    const resolvedTarget = createResolvedTarget()
    const startSessionFromTarget = vi.fn().mockResolvedValue(
      createSession({
        id: 'public-session',
        youtubeBroadcastId: resolvedTarget.videoId,
        liveChatId: resolvedTarget.liveChatId,
        title: resolvedTarget.title,
        sourceMode: 'public_video'
      })
    )

    window.api = createMockApi({
      youtube: {
        getBroadcasts: vi.fn().mockResolvedValue([]),
        resolveTarget: vi.fn().mockResolvedValue(resolvedTarget),
        startSessionFromTarget,
        stopSession: vi.fn().mockResolvedValue(null)
      }
    }) as Window['api']

    render(<StreamInfo />)

    await userEvent.click(await screen.findByRole('button', { name: /^open$/i }))
    await userEvent.type(
      screen.getByPlaceholderText(/paste a watch url, youtu\.be url, or 11-character video id/i),
      'https://youtu.be/public12345a?si=test'
    )
    await userEvent.click(screen.getByRole('button', { name: /^resolve$/i }))

    expect(await screen.findByText('Public Live Stream')).toBeInTheDocument()
    expect(screen.getByText('Public Channel')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /monitor stream/i }))

    await waitFor(() => {
      expect(startSessionFromTarget).toHaveBeenCalledWith(resolvedTarget)
    })
    expect(await screen.findByText('Live Session')).toBeInTheDocument()
    expect(screen.getAllByText('Public Stream').length).toBeGreaterThan(0)
  })

  it.each([
    'Invalid YouTube URL or video ID. Enter a watch URL, youtu.be URL, or 11-character video ID.',
    'This video is not live right now.',
    "This livestream doesn't have an active live chat available for monitoring."
  ])('shows public target resolver errors inline: %s', async (message) => {
    useAuthStore.setState({
      status: { authenticated: true, oauthConfigured: true, displayName: 'Creator' },
      loading: false,
      error: null
    })

    window.api = createMockApi({
      youtube: {
        getBroadcasts: vi.fn().mockResolvedValue([]),
        resolveTarget: vi
          .fn()
          .mockRejectedValue(
            new Error(`Error invoking remote method 'youtube:resolve-target': Error: ${message}`)
          ),
        stopSession: vi.fn().mockResolvedValue(null)
      }
    }) as Window['api']

    render(<StreamInfo />)

    await userEvent.click(await screen.findByRole('button', { name: /^open$/i }))
    await userEvent.type(
      screen.getByPlaceholderText(/paste a watch url, youtu\.be url, or 11-character video id/i),
      'https://youtu.be/public12345a?si=test'
    )
    await userEvent.click(screen.getByRole('button', { name: /^resolve$/i }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByText(/Error invoking remote method/i)).not.toBeInTheDocument()
  })

  it('distinguishes overlay empty states for no session and no paid messages yet', () => {
    const { rerender } = render(
      <OverlayFeed
        messages={[]}
        onMarkRead={() => undefined}
        onSave={() => undefined}
        hasActiveSession={false}
      />
    )

    expect(screen.getByText('No active stream')).toBeInTheDocument()

    rerender(
      <OverlayFeed
        messages={[]}
        onMarkRead={() => undefined}
        onSave={() => undefined}
        hasActiveSession
      />
    )

    expect(screen.getByText('No Super Chats yet')).toBeInTheDocument()
  })

  it('lists only saved items and calls undo when moving one back to inbox', async () => {
    const undo = vi.fn().mockResolvedValue(null)
    window.api = createMockApi({
      superchats: {
        list: vi.fn(),
        markRead: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(null),
        undo
      }
    }) as Window['api']

    useSuperchatStore.setState({
      sessionId: 'session-1',
      messages: [
        createMessage('saved-one', { state: 'saved', donorDisplayName: 'Saved Donor' }),
        createMessage('unread-one', { state: 'unread', donorDisplayName: 'Unread Donor' })
      ],
      donors: [],
      stats: {
        ...EMPTY_STATS,
        messageCount: 2,
        unreadCount: 1,
        savedCount: 1,
        totalConverted: 10,
        averageDonation: 5,
        convertedCurrency: 'USD'
      },
      sort: 'latest',
      undoEntry: null,
      loading: false
    })

    render(<SavedItems />)

    expect(screen.getByText('Saved Donor')).toBeInTheDocument()
    expect(screen.queryByText('Unread Donor')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /move to inbox/i }))

    expect(undo).toHaveBeenCalledWith('saved-one')
  })

  it('renders the donor leaderboard with ranked supporters', () => {
    useSuperchatStore.setState({
      donors: [
        createDonor('leader', 50, { displayName: 'Top Donor', messageCount: 2 }),
        createDonor('runner', 25, { displayName: 'Runner Up', messageCount: 1 })
      ],
      stats: {
        ...EMPTY_STATS,
        convertedCurrency: 'USD'
      }
    })
    useStreamStore.setState({
      activeSession: createSession({ convertedCurrency: 'USD' })
    })

    render(<DonorLeaderboard />)

    expect(screen.getByText('Top Donor')).toBeInTheDocument()
    expect(screen.getByText('Runner Up')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
    expect(screen.getByText('$25.00')).toBeInTheDocument()
  })

  it('renders stream summary details from the canonical summary payload', () => {
    render(<StreamSummary summary={createSummary()} />)

    expect(screen.getByText('Stream Summary')).toBeInTheDocument()
    expect(screen.getByText('My Active Stream')).toBeInTheDocument()
    expect(screen.getByText('Total Donations')).toBeInTheDocument()
    expect(screen.getByText('Super Stickers')).toBeInTheDocument()
    expect(screen.getByText('Saved (Unresolved)')).toBeInTheDocument()
    expect(screen.getAllByText('Top Donor').length).toBeGreaterThan(0)
    expect(screen.getByText('Runner Up')).toBeInTheDocument()
    expect(screen.getByText('$75.00')).toBeInTheDocument()
  })

  it('shows source badges in session history for public sessions', async () => {
    window.api = createMockApi({
      sessions: {
        list: vi.fn().mockResolvedValue([
          createSession({
            id: 'history-public',
            title: 'History Session',
            sourceMode: 'public_video',
            status: 'ended',
            endedAt: '2026-03-30T13:00:00.000Z'
          })
        ])
      }
    }) as Window['api']

    render(<SessionHistory />)

    expect(await screen.findByText('History Session')).toBeInTheDocument()
    expect(screen.getByText('Public Stream')).toBeInTheDocument()
  })

  it('renders stream summary badges for public sessions', () => {
    render(
      <StreamSummary
        summary={createSummary({
          title: 'Shared Livestream',
          sourceMode: 'public_video'
        })}
      />
    )

    expect(screen.getByText('Shared Livestream')).toBeInTheDocument()
    expect(screen.getByText('Public Stream')).toBeInTheDocument()
  })

  it('hydrates renderer stores from sessions:get-active and preferences bootstrap', async () => {
    const snapshot = createSnapshot()
    window.api = createMockApi({
      settings: {
        get: vi.fn().mockResolvedValue({
          ...DEFAULT_PREFERENCES,
          defaultSort: 'highest'
        }),
        update: vi.fn()
      },
      sessions: {
        list: vi.fn(),
        summary: vi.fn(),
        getActive: vi.fn().mockResolvedValue(snapshot)
      }
    }) as Window['api']

    render(<RuntimeSyncHarness />)

    await waitFor(() => {
      expect(screen.getByTestId('session-title')).toHaveTextContent('Morning Stream')
    })
    expect(screen.getByTestId('message-count')).toHaveTextContent('2')
    expect(screen.getByTestId('sort')).toHaveTextContent('highest')
    expect(useSuperchatStore.getState().messages.map((message) => message.id)).toEqual(['b', 'a'])
  })
})
