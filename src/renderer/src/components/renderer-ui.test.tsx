// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardShell } from './layout/DashboardShell'
import { OverlayShell } from './layout/OverlayShell'
import { StreamInfo } from './dashboard/StreamInfo'
import { SettingsPanel } from './dashboard/SettingsPanel'
import { OverlayFeed } from './overlay/OverlayFeed'
import { SavedItems } from './dashboard/SavedItems'
import { SessionHistory } from './dashboard/SessionHistory'
import { DonorLeaderboard } from './leaderboard/DonorLeaderboard'
import { StreamSummary } from './summary/StreamSummary'
import { useRuntimeSync } from '../hooks/useRuntimeSync'
import { useAuthStore } from '../store/auth'
import { useSettingsStore } from '../store/settings'
import { useSavedItemsStore } from '../store/saved-items'
import { useStreamStore } from '../store/stream'
import { EMPTY_STATS, useSuperchatStore } from '../store/superchats'
import type {
  ActiveSessionSnapshot,
  AppMeta,
  AppPreferences,
  DonorAggregate,
  LeaderboardDonorAggregate,
  PaidMessage,
  ResolvedLiveTarget,
  SavedArchiveItem,
  SessionReport,
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

function createAllTimeDonor(
  id: string,
  totalConverted: number,
  overrides: Partial<LeaderboardDonorAggregate> = {}
): LeaderboardDonorAggregate {
  return {
    channelId: `all-time-${id}`,
    displayName: `All Time ${id}`,
    avatarUrl: null,
    totalConverted,
    messageCount: 1,
    firstSeenAt: '2026-03-01T12:00:00.000Z',
    lastSeenAt: '2026-03-30T12:00:00.000Z',
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

function createSavedArchiveItem(
  id: string,
  overrides: Partial<SavedArchiveItem> = {}
): SavedArchiveItem {
  return {
    ...createMessage(id, { state: 'saved' }),
    sessionTitle: 'Morning Stream',
    sessionStatus: 'active',
    sessionStartedAt: '2026-03-30T12:00:00.000Z',
    sessionEndedAt: null,
    state: 'saved',
    ...overrides
  }
}

function createReport(overrides: Partial<SessionReport> = {}): SessionReport {
  const summary = createSummary()
  return {
    ...summary,
    durationMinutes: 60,
    topSupporters: summary.topDonors,
    topDonor: summary.highestDonor,
    highestSingleDonation: {
      messageId: 'message-top',
      donorChannelId: 'donor-leader',
      donorDisplayName: 'Top Donor',
      donorAvatarUrl: null,
      amount: 50,
      currency: 'USD',
      receivedAt: '2026-03-30T12:30:00.000Z',
      type: 'super_chat'
    },
    peakDonationWindow: {
      startAt: '2026-03-30T12:15:00.000Z',
      endAt: '2026-03-30T12:45:00.000Z',
      totalConverted: 60,
      messageCount: 2
    },
    comparisonToPrevious: {
      previousSessionId: 'previous-session',
      previousTitle: 'Yesterday Stream',
      totalRaisedDelta: 15,
      superChatsDelta: 1,
      uniqueDonorsDelta: 1,
      averageDonationDelta: 5
    },
    amountBuckets: {
      underTwenty: 1,
      twentyToFortyNine: 0,
      fiftyToNinetyNine: 1,
      hundredPlus: 0
    },
    typeBreakdown: {
      superChats: { count: 2, totalConverted: 50 },
      superStickers: { count: 1, totalConverted: 25 }
    },
    uniqueDonors: 2,
    repeatDonors: 1,
    newSupporters: 1,
    messagesPerHour: 3,
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
      listSaved: vi.fn().mockResolvedValue([]),
      markRead: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(null),
      undo: vi.fn().mockResolvedValue(null),
      markAllRead: vi.fn().mockResolvedValue([]),
      clearSaved: vi.fn().mockResolvedValue([]),
      exportSaved: vi.fn().mockResolvedValue(null),
      copyText: vi.fn().mockResolvedValue(null)
    },
    donors: {
      list: vi.fn().mockResolvedValue([]),
      listAllTime: vi.fn().mockResolvedValue([]),
      exportLeaderboard: vi.fn().mockResolvedValue(null)
    },
    sessions: {
      list: vi.fn().mockResolvedValue([]),
      summary: vi.fn().mockResolvedValue(null),
      report: vi.fn().mockResolvedValue(null),
      getActive: vi.fn().mockResolvedValue(null),
      exportCsv: vi.fn().mockResolvedValue(null),
      copySummary: vi.fn().mockResolvedValue(null)
    },
    settings: {
      get: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES),
      update: vi.fn().mockImplementation(async (patch: Partial<AppPreferences>) => ({
        ...DEFAULT_PREFERENCES,
        ...patch
      })),
      clearLocalData: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES)
    },
    app: {
      getMeta: vi.fn().mockResolvedValue({
        name: 'ChatControl',
        version: '2.4.1'
      } satisfies AppMeta)
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
    app: { ...api.app, ...overrides.app },
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
    appMeta: null,
    loading: false,
    appMetaLoading: false,
    error: null,
    saving: {},
    clearingData: false,
    clearDataConfirmOpen: false
  })
  useSavedItemsStore.getState().reset()
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
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted')
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps the dashboard shell visible when signed out', async () => {
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

    expect(await screen.findByRole('heading', { name: /^Stream Monitor$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByText('YouTube is not connected')).toBeInTheDocument()
    expect(screen.queryByText('Sign in with YouTube')).not.toBeInTheDocument()
  })

  it('shows OAuth setup guidance inside the settings account card', async () => {
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

    await userEvent.click(await screen.findByRole('button', { name: /settings/i }))

    expect(await screen.findByText('OAuth configuration required')).toBeInTheDocument()
    expect(screen.getByText(/GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Connect$/i })).toBeDisabled()
  })

  it('shows a cleaned login error inside the settings account card', async () => {
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

    await userEvent.click(await screen.findByRole('button', { name: /settings/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^Connect$/i }))

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
    expect(screen.getByText('Monitor Any Livestream')).toBeInTheDocument()
    expect(screen.getByText('Use the URL resolver')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Start a stream on YouTube, then refresh or resolve any public livestream from the right rail.'
      )
    ).toBeInTheDocument()
  })

  it('renders compact connection status tiles and quota fallback without verbose body copy', async () => {
    useAuthStore.setState({
      status: { authenticated: true, oauthConfigured: true, displayName: 'Creator' },
      loading: false,
      error: null
    })

    window.api = createMockApi({
      youtube: {
        getBroadcasts: vi.fn().mockResolvedValue([])
      }
    }) as Window['api']

    render(<StreamInfo />)

    expect(await screen.findByText('Connection Status')).toBeInTheDocument()
    expect(screen.getByText('YouTube API')).toBeInTheDocument()
    expect(screen.getByText('Channel OAuth')).toBeInTheDocument()
    expect(screen.getByText('API Quota Left')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Authorized')).toBeInTheDocument()
    expect(screen.getByText('--')).toBeInTheDocument()
    expect(screen.queryByText('Broadcast discovery available.')).not.toBeInTheDocument()
    expect(screen.queryByText('Channel access is active.')).not.toBeInTheDocument()
  })

  it('sanitizes stream error copy and keeps quota tile compact when quota errors occur', async () => {
    useAuthStore.setState({
      status: { authenticated: true, oauthConfigured: true, displayName: 'Creator' },
      loading: false,
      error: null
    })

    window.api = createMockApi({
      youtube: {
        getBroadcasts: vi
          .fn()
          .mockRejectedValue(
            new Error(
              'The request cannot be completed because you have exceeded your <a href="/youtube/v3/getting-started#quota">quota</a>.'
            )
          )
      }
    }) as Window['api']

    render(<StreamInfo />)

    expect(await screen.findByText('Rate Limited')).toBeInTheDocument()
    expect(screen.getByText('--')).toBeInTheDocument()
    expect(
      screen.getByText('The request cannot be completed because you have exceeded your quota.')
    ).toBeInTheDocument()
    expect(screen.queryByText(/<a href=/i)).not.toBeInTheDocument()
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

    await userEvent.type(
      screen.getByPlaceholderText(/youtube\.com\/watch\?v=\.\.\. or video id/i),
      'https://youtu.be/public12345a?si=test'
    )
    await userEvent.click(screen.getByRole('button', { name: /resolve stream/i }))

    expect(await screen.findByText('Public Live Stream')).toBeInTheDocument()
    expect(screen.getByText('Public Channel')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /start monitoring/i }))

    await waitFor(() => {
      expect(startSessionFromTarget).toHaveBeenCalledWith(resolvedTarget)
    })
    expect(await screen.findByText('Live Session')).toBeInTheDocument()
    expect(screen.getAllByText('Public Stream').length).toBeGreaterThan(0)
  })

  it('renders the live session command view and runs quick actions', async () => {
    useAuthStore.setState({
      status: {
        authenticated: true,
        oauthConfigured: true,
        displayName: 'Creator',
        email: 'creator@example.com'
      },
      loading: false,
      error: null
    })
    useStreamStore.setState({
      activeSession: createSession({ title: 'Launch Stream' }),
      streamStatus: { type: 'connected', sessionId: 'session-1' },
      loading: false,
      loadingContext: null,
      error: null,
      errorContext: null
    })
    useSuperchatStore.setState({
      sessionId: 'session-1',
      messages: [
        createMessage('priority', {
          donorDisplayName: 'StreamFan2024',
          convertedAmount: 50,
          amountDisplayString: '$50.00',
          messageText: 'Amazing stream today!'
        }),
        createMessage('saved-one', {
          donorDisplayName: 'NightOwl',
          convertedAmount: 12,
          state: 'saved',
          receivedAt: '2026-03-30T12:05:00.000Z'
        })
      ],
      donors: [
        createDonor('leader', 127, { displayName: 'StreamFan2024', messageCount: 3 }),
        createDonor('runner', 62.5, { displayName: 'NightOwl', messageCount: 2 })
      ],
      stats: {
        ...EMPTY_STATS,
        totalConverted: 62,
        messageCount: 2,
        unreadCount: 1,
        savedCount: 1,
        averageDonation: 31,
        convertedCurrency: 'USD'
      },
      sort: 'latest',
      undoEntry: null,
      loading: false
    })

    const toggleOverlay = vi.fn().mockResolvedValue(undefined)
    const markAllRead = vi.fn().mockResolvedValue([createMessage('priority', { state: 'read' })])
    const exportCsv = vi.fn().mockResolvedValue('/tmp/chatcontrol-session.csv')
    const copySummary = vi.fn().mockResolvedValue('ChatControl Session Summary')

    window.api = createMockApi({
      youtube: {
        getBroadcasts: vi.fn().mockResolvedValue([])
      },
      window: {
        toggleOverlay
      },
      superchats: {
        markAllRead
      },
      sessions: {
        exportCsv,
        copySummary
      }
    }) as Window['api']

    render(<StreamInfo />)

    expect(screen.getByText('Top Donor This Stream')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open overlay/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /open overlay/i }))
    await userEvent.click(screen.getByRole('button', { name: /mark all read/i }))
    await userEvent.click(screen.getByRole('button', { name: /export csv/i }))
    await userEvent.click(screen.getByRole('button', { name: /copy summary/i }))

    expect(toggleOverlay).toHaveBeenCalledTimes(1)
    expect(markAllRead).toHaveBeenCalledWith('session-1')
    expect(exportCsv).toHaveBeenCalledWith('session-1')
    expect(copySummary).toHaveBeenCalledWith('session-1')
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

    await userEvent.type(
      screen.getByPlaceholderText(/youtube\.com\/watch\?v=\.\.\. or video id/i),
      'https://youtu.be/public12345a?si=test'
    )
    await userEvent.click(screen.getByRole('button', { name: /resolve stream/i }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByText(/Error invoking remote method/i)).not.toBeInTheDocument()
  })

  it('renders overlay loading, error, and empty states', () => {
    const { rerender } = render(
      <OverlayFeed messages={[]} onMarkRead={() => undefined} onSave={() => undefined} loading />
    )

    expect(screen.getByText('Loading overlay inbox')).toBeInTheDocument()

    rerender(
      <OverlayFeed
        messages={[]}
        onMarkRead={() => undefined}
        onSave={() => undefined}
        errorMessage="Polling failed"
      />
    )

    expect(screen.getByText('Overlay connection issue')).toBeInTheDocument()
    expect(screen.getByText('Polling failed')).toBeInTheDocument()

    rerender(
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

  it('renders the live overlay shell with merged metrics and sort dropdown', async () => {
    const snapshot = createSnapshot({
      messages: [
        createMessage('active', {
          donorDisplayName: 'StreamFan2024',
          amountDisplayString: '$50.00',
          originalAmount: 50,
          convertedAmount: 50,
          tier: 7,
          receivedAt: '2026-03-30T12:05:00.000Z',
          messageText: 'Amazing stream today!'
        }),
        createMessage('saved', {
          donorDisplayName: 'NightOwl_Live',
          amountDisplayString: '$5.00',
          originalAmount: 5,
          convertedAmount: 5,
          tier: 3,
          receivedAt: '2026-03-30T12:03:00.000Z',
          state: 'saved',
          messageText: 'Sending some love from the night shift!'
        })
      ],
      stats: {
        ...EMPTY_STATS,
        totalConverted: 55,
        messageCount: 2,
        unreadCount: 1,
        savedCount: 1,
        averageDonation: 27.5,
        convertedCurrency: 'USD'
      }
    })

    window.api = createMockApi({
      sessions: {
        list: vi.fn(),
        summary: vi.fn(),
        getActive: vi.fn().mockResolvedValue(snapshot)
      },
      settings: {
        get: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES),
        update: vi.fn().mockImplementation(async (patch: Partial<AppPreferences>) => ({
          ...DEFAULT_PREFERENCES,
          ...patch
        }))
      }
    }) as Window['api']

    render(<OverlayShell />)

    expect(await screen.findByText('StreamFan2024', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('$55.00')).toBeInTheDocument()
    expect(screen.getByText('Unread')).toBeInTheDocument()
    expect(screen.getByText('Saved', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Latest')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText(/sort messages/i), 'highest')

    expect(useSuperchatStore.getState().sort).toBe('highest')
  })

  it('emphasizes the first unread overlay card and shows the unread-below banner', async () => {
    const markRead = vi.fn()
    const save = vi.fn()

    render(
      <OverlayFeed
        messages={[
          createMessage('active', {
            donorDisplayName: 'StreamFan2024',
            amountDisplayString: '$50.00',
            originalAmount: 50,
            convertedAmount: 50,
            tier: 7,
            receivedAt: '2026-03-30T12:05:00.000Z',
            messageText: 'Amazing stream today! Been watching since the start.'
          }),
          createMessage('read', {
            donorDisplayName: 'CasualViewer',
            amountDisplayString: '$2.00',
            originalAmount: 2,
            convertedAmount: 2,
            tier: 1,
            state: 'read',
            receivedAt: '2026-03-30T12:00:00.000Z',
            messageText: 'Thanks for the entertainment!'
          }),
          createMessage('sticker', {
            donorDisplayName: 'StickerFan',
            amountDisplayString: '$4.99',
            originalAmount: 4.99,
            convertedAmount: 4.99,
            type: 'super_sticker',
            tier: 4,
            messageText: null,
            stickerAltText: 'Sent a Super Sticker',
            receivedAt: '2026-03-30T11:58:00.000Z',
            state: 'read'
          }),
          createMessage('below', {
            donorDisplayName: 'LoyalSupporter',
            amountDisplayString: '$8.00',
            originalAmount: 8,
            convertedAmount: 8,
            tier: 7,
            receivedAt: '2026-03-30T11:56:00.000Z'
          })
        ]}
        onMarkRead={markRead}
        onSave={save}
        hasActiveSession
      />
    )

    expect(screen.getByText('Sent a Super Sticker')).toBeInTheDocument()
    expect(screen.getByText('1 more unread message below')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Mark Read'))
    await userEvent.click(screen.getByText('Save'))

    expect(markRead).toHaveBeenCalledWith('active')
    expect(save).toHaveBeenCalledWith('active')
  })

  it('switches overlay header variants for offline, ended, and error runtime states', async () => {
    const api = createMockApi({
      sessions: {
        list: vi.fn(),
        summary: vi.fn(),
        getActive: vi.fn().mockResolvedValue(null)
      }
    })

    window.api = api as Window['api']

    render(<OverlayShell />)

    expect(await screen.findByText('Offline')).toBeInTheDocument()

    api.__emit('streamStatus', { type: 'ended', sessionId: 'session-1' })

    expect(await screen.findByText('Ended')).toBeInTheDocument()

    api.__emit('streamStatus', {
      type: 'error',
      sessionId: 'session-1',
      message: 'Stream polling failed'
    })

    expect(await screen.findByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Stream polling failed')).toBeInTheDocument()
  })

  it('renders the saved archive, exports it, and disables move to inbox for historical items', async () => {
    const exportSaved = vi.fn().mockResolvedValue('/tmp/chatcontrol-saved-items.csv')
    const undo = vi.fn().mockResolvedValue(createMessage('saved-one', { state: 'unread' }))
    const markRead = vi.fn().mockResolvedValue(createMessage('saved-one', { state: 'read' }))

    window.api = createMockApi({
      superchats: {
        listSaved: vi.fn().mockResolvedValue([
          createSavedArchiveItem('saved-one', {
            donorDisplayName: 'Saved Donor',
            amountDisplayString: '$50.00',
            originalAmount: 50,
            convertedAmount: 50,
            tier: 7,
            sessionId: 'session-1'
          }),
          createSavedArchiveItem('saved-two', {
            donorDisplayName: 'Historical Donor',
            amountDisplayString: '$10.00',
            originalAmount: 10,
            convertedAmount: 10,
            tier: 1,
            sessionId: 'session-older',
            sessionStatus: 'ended',
            sessionEndedAt: '2026-03-28T13:00:00.000Z'
          })
        ]),
        exportSaved,
        undo,
        markRead
      }
    }) as Window['api']

    useStreamStore.setState({
      ...useStreamStore.getState(),
      activeSession: createSession({ id: 'session-1' })
    })

    render(<SavedItems />)

    expect(await screen.findByText('Saved Donor')).toBeInTheDocument()
    expect(screen.getByText('Historical Donor')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /export all/i }))
    expect(exportSaved).toHaveBeenCalledWith('highest')

    const moveButtons = screen.getAllByRole('button', { name: /move to inbox/i })
    expect(moveButtons[0]).toBeEnabled()
    expect(moveButtons[1]).toBeDisabled()

    await userEvent.click(screen.getAllByRole('button', { name: /mark as read/i })[0])
    expect(markRead).toHaveBeenCalledWith('saved-one')
  })

  it('filters saved archive items by type and amount and omits copy text for sticker-only cards', async () => {
    window.api = createMockApi({
      superchats: {
        listSaved: vi.fn().mockResolvedValue([
          createSavedArchiveItem('chat-one', {
            donorDisplayName: 'Blue Donor',
            originalAmount: 25,
            convertedAmount: 25,
            amountDisplayString: '$25.00',
            type: 'super_chat'
          }),
          createSavedArchiveItem('sticker-one', {
            donorDisplayName: 'Sticker Donor',
            originalAmount: 4.99,
            convertedAmount: 4.99,
            amountDisplayString: '$4.99',
            type: 'super_sticker',
            messageText: null,
            stickerAltText: 'Sent a Super Sticker',
            tier: 4
          })
        ])
      }
    }) as Window['api']

    render(<SavedItems />)

    expect(await screen.findByText('Blue Donor')).toBeInTheDocument()
    expect(screen.getByText('Sticker Donor')).toBeInTheDocument()
    expect(screen.getByText('Sent a Super Sticker')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /copy text/i })).toHaveLength(1)

    await userEvent.click(screen.getAllByRole('button', { name: /^Stickers$/i })[0]!)
    expect(screen.queryByText('Blue Donor')).not.toBeInTheDocument()
    expect(screen.getByText('Sticker Donor')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /\$20 - \$49/i }))
    expect(await screen.findByText(/no saved items match these filters/i)).toBeInTheDocument()
  })

  it('requires confirmation before clearing all saved items', async () => {
    const clearSaved = vi.fn().mockResolvedValue([createMessage('saved-one', { state: 'read' })])
    window.api = createMockApi({
      superchats: {
        listSaved: vi.fn().mockResolvedValue([createSavedArchiveItem('saved-one')]),
        clearSaved
      }
    }) as Window['api']

    render(<SavedItems />)

    expect(await screen.findByText('Donor saved-one')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(screen.getByRole('button', { name: /confirm clear/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /confirm clear/i }))

    await waitFor(() => {
      expect(clearSaved).toHaveBeenCalled()
    })
  })

  it('shows saved archive empty and error states', async () => {
    window.api = createMockApi({
      superchats: {
        listSaved: vi.fn().mockResolvedValue([])
      }
    }) as Window['api']

    render(<SavedItems />)
    expect(await screen.findByText(/no saved items yet/i)).toBeInTheDocument()

    cleanup()
    resetStores()

    const listSaved = vi
      .fn()
      .mockRejectedValueOnce(new Error('Saved archive failed'))
      .mockResolvedValueOnce([])

    window.api = createMockApi({
      superchats: {
        listSaved
      }
    }) as Window['api']

    render(<SavedItems />)

    expect(await screen.findByText(/saved archive unavailable/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(listSaved).toHaveBeenCalledTimes(2)
    })
  })

  it('renders the donor leaderboard, switches scopes, and exports the visible ranking', async () => {
    const listAllTime = vi.fn().mockResolvedValue([
      createAllTimeDonor('legacy-leader', 320, {
        displayName: 'LegacyLeader',
        messageCount: 9
      }),
      createAllTimeDonor('legacy-runner', 210, {
        displayName: 'LegacyRunner',
        messageCount: 6
      })
    ])
    const exportLeaderboard = vi.fn().mockResolvedValue('/tmp/chatcontrol-leaderboard-all-time.csv')

    window.api = createMockApi({
      donors: {
        listAllTime,
        exportLeaderboard
      }
    }) as Window['api']

    useSuperchatStore.setState({
      donors: [
        createDonor('leader', 1247, { displayName: 'StreamFan2024', messageCount: 28 }),
        createDonor('runner', 485, { displayName: 'GamerPro99', messageCount: 12 }),
        createDonor('third', 342.5, { displayName: 'NightOwl_Live', messageCount: 9 }),
        createDonor('fourth', 198.93, { displayName: 'StickerFan', messageCount: 7 })
      ],
      stats: {
        ...EMPTY_STATS,
        convertedCurrency: 'USD'
      },
      loading: false
    })
    useStreamStore.setState({
      activeSession: createSession({ convertedCurrency: 'USD' })
    })

    render(<DonorLeaderboard />)

    expect(screen.getByText('Donor Leaderboard')).toBeInTheDocument()
    expect(screen.getByText('StreamFan2024')).toBeInTheDocument()
    expect(screen.getByText('GamerPro99')).toBeInTheDocument()
    expect(screen.getByText('NightOwl_Live')).toBeInTheDocument()
    expect(screen.getByText('StickerFan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /this stream/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /all time/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /all time/i }))

    expect(await screen.findByText('LegacyLeader')).toBeInTheDocument()
    expect(screen.getByText('LegacyRunner')).toBeInTheDocument()
    expect(listAllTime).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: /^export$/i }))

    expect(exportLeaderboard).toHaveBeenCalledWith('all_time')
    expect(await screen.findByText(/chatcontrol-leaderboard-all-time\.csv/i)).toBeInTheDocument()
  })

  it('shows an all-time leaderboard error state with retry', async () => {
    const listAllTime = vi
      .fn()
      .mockRejectedValueOnce(new Error('Leaderboard fetch failed'))
      .mockResolvedValueOnce([
        createAllTimeDonor('returning', 110, { displayName: 'ReturningFan' })
      ])

    window.api = createMockApi({
      donors: {
        listAllTime
      }
    }) as Window['api']

    useSuperchatStore.setState({
      donors: [],
      stats: {
        ...EMPTY_STATS,
        convertedCurrency: 'USD'
      },
      loading: false
    })

    render(<DonorLeaderboard />)

    await userEvent.click(screen.getByRole('button', { name: /all time/i }))

    expect(await screen.findByText('Leaderboard unavailable')).toBeInTheDocument()
    expect(screen.getByText('Leaderboard fetch failed')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('ReturningFan')).toBeInTheDocument()
    expect(listAllTime).toHaveBeenCalledTimes(2)
  })

  it('renders stream summary details from the canonical summary payload', () => {
    render(<StreamSummary summary={createSummary()} />)

    expect(screen.getByText('Stream Summary')).toBeInTheDocument()
    expect(screen.getByText('Connected Channel')).toBeInTheDocument()
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

  it('renders grouped session history, merges the active session, and filters by date range', async () => {
    const user = userEvent.setup()
    const now = new Date()
    const hoursAgo = (value: number): string =>
      new Date(now.getTime() - value * 60 * 60 * 1000).toISOString()
    const daysAgo = (value: number, hour: number, minute = 0): string => {
      const date = new Date(now)
      date.setDate(date.getDate() - value)
      date.setHours(hour, minute, 0, 0)
      return date.toISOString()
    }

    useAuthStore.setState({
      status: { authenticated: true, oauthConfigured: true, displayName: 'My Channel' },
      loading: false,
      error: null
    })
    useStreamStore.setState({
      activeSession: createSession({
        id: 'live-session',
        title: "Sunday Night Gaming Marathon - Let's Go!",
        startedAt: hoursAgo(3),
        status: 'active',
        endedAt: null
      }),
      streamStatus: { type: 'connected', sessionId: 'live-session' },
      loading: false,
      loadingContext: null,
      error: null,
      errorContext: null
    })
    useSuperchatStore.setState({
      ...useSuperchatStore.getState(),
      sessionId: 'live-session',
      stats: {
        ...EMPTY_STATS,
        totalConverted: 1284,
        messageCount: 59,
        stickerCount: 12,
        convertedCurrency: 'USD'
      }
    })

    window.api = createMockApi({
      sessions: {
        list: vi.fn().mockResolvedValue([
          createSession({
            id: 'yesterday-complete',
            title: 'Saturday Night Stream - Viewer Requests!',
            status: 'ended',
            startedAt: daysAgo(1, 20),
            endedAt: daysAgo(1, 23, 23),
            totalConverted: 2147,
            messageCount: 113,
            stickerCount: 24
          }),
          createSession({
            id: 'yesterday-error',
            title: 'Quick Q&A Session',
            status: 'error',
            startedAt: daysAgo(1, 14),
            endedAt: daysAgo(1, 14, 31),
            totalConverted: 187,
            messageCount: 15,
            stickerCount: 3,
            lastError: 'Connection lost'
          }),
          createSession({
            id: 'week-1',
            title: 'Midweek Chill Stream',
            status: 'ended',
            startedAt: daysAgo(3, 19),
            endedAt: daysAgo(3, 22, 15),
            totalConverted: 1423,
            messageCount: 74,
            stickerCount: 18
          }),
          createSession({
            id: 'week-2',
            title: 'Monday Kickoff',
            status: 'ended',
            startedAt: daysAgo(5, 18),
            endedAt: daysAgo(5, 20, 45),
            totalConverted: 892,
            messageCount: 42,
            stickerCount: 8
          }),
          createSession({
            id: 'earlier-1',
            title: 'Earlier Archive Session',
            status: 'ended',
            startedAt: daysAgo(20, 18),
            endedAt: daysAgo(20, 19, 30),
            totalConverted: 520,
            messageCount: 18,
            stickerCount: 2
          })
        ])
      }
    }) as Window['api']

    render(<SessionHistory />)

    expect(await screen.findByText("Sunday Night Gaming Marathon - Let's Go!")).toBeInTheDocument()
    expect(screen.getByText('TODAY')).toBeInTheDocument()
    expect(screen.getByText('YESTERDAY')).toBeInTheDocument()
    expect(screen.getByText('THIS WEEK')).toBeInTheDocument()
    expect(screen.getByText('EARLIER')).toBeInTheDocument()
    expect(screen.getByText('View Session')).toBeInTheDocument()
    expect(screen.getByText('View Details')).toBeInTheDocument()
    expect(screen.getByText('$1,284.00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /export all/i }))
    expect(
      screen.getByText(
        /Bulk export is coming soon\. Use any session summary to export individual CSVs today\./i
      )
    ).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /date range/i }), 'last7')
    expect(screen.queryByText('EARLIER')).not.toBeInTheDocument()
    expect(screen.queryByText('Earlier Archive Session')).not.toBeInTheDocument()
  })

  it('renders the empty history state when no sessions exist', async () => {
    window.api = createMockApi({
      sessions: {
        list: vi.fn().mockResolvedValue([])
      }
    }) as Window['api']

    render(<SessionHistory />)

    expect(await screen.findByText('No sessions in history yet')).toBeInTheDocument()
  })

  it('shows the list-level history error state and retries', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error('Database offline'))
      .mockResolvedValueOnce([createSession({ title: 'Recovered Session', status: 'ended' })])

    window.api = createMockApi({
      sessions: {
        list
      }
    }) as Window['api']

    render(<SessionHistory />)

    expect(await screen.findByText('Session history unavailable')).toBeInTheDocument()
    expect(screen.getByText('Database offline')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Recovered Session')).toBeInTheDocument()
  })

  it('opens a history session into the rich stream summary detail screen and runs actions', async () => {
    const exportCsv = vi.fn().mockResolvedValue('/tmp/history-session.csv')
    const copySummary = vi.fn().mockResolvedValue('ChatControl Session Summary')
    const report = createReport()

    window.api = createMockApi({
      sessions: {
        list: vi.fn().mockResolvedValue([
          createSession({
            id: report.id,
            title: report.title,
            status: 'ended',
            endedAt: report.endedAt,
            totalConverted: report.totalConverted,
            messageCount: report.messageCount,
            stickerCount: report.stickerCount
          })
        ]),
        report: vi.fn().mockResolvedValue(report),
        exportCsv,
        copySummary
      }
    }) as Window['api']

    render(<SessionHistory />)

    await userEvent.click(await screen.findByRole('button', { name: /morning stream/i }))

    expect(await screen.findByText('Stream Summary')).toBeInTheDocument()
    expect(screen.getByText('Top Donor This Stream')).toBeInTheDocument()
    expect(screen.getByText('Donation Breakdown')).toBeInTheDocument()
    expect(screen.getByText('COMPLETED')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /export csv/i }))
    await userEvent.click(screen.getByRole('button', { name: /share summary/i }))

    expect(exportCsv).toHaveBeenCalledWith(report.id)
    expect(copySummary).toHaveBeenCalledWith(report.id)
  })

  it('shows an inline report error state when a history summary fails to load', async () => {
    window.api = createMockApi({
      sessions: {
        list: vi.fn().mockResolvedValue([
          createSession({
            id: 'broken-session',
            title: 'Broken Session',
            status: 'ended',
            endedAt: '2026-03-30T13:00:00.000Z'
          })
        ]),
        report: vi.fn().mockRejectedValue(new Error('History report failed'))
      }
    }) as Window['api']

    render(<SessionHistory />)

    await userEvent.click(await screen.findByRole('button', { name: /broken session/i }))

    expect(await screen.findByText('Stream Summary unavailable')).toBeInTheDocument()
    expect(screen.getByText('History report failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to history/i })).toBeInTheDocument()
  })

  it('renders live history reports with the live status variant', async () => {
    const liveReport = createReport({
      id: 'live-report',
      title: 'Live Report',
      status: 'active',
      endedAt: null
    })

    window.api = createMockApi({
      sessions: {
        list: vi.fn().mockResolvedValue([
          createSession({
            id: liveReport.id,
            title: liveReport.title,
            status: 'active',
            endedAt: null,
            totalConverted: liveReport.totalConverted,
            messageCount: liveReport.messageCount,
            stickerCount: liveReport.stickerCount
          })
        ]),
        report: vi.fn().mockResolvedValue(liveReport)
      }
    }) as Window['api']

    render(<SessionHistory />)

    await userEvent.click(await screen.findByRole('button', { name: /live report/i }))

    expect(await screen.findByText('LIVE')).toBeInTheDocument()
    expect(screen.getByText(/Live now/i)).toBeInTheDocument()
  })

  it('shows the history-view sidebar footer state from the approved shell', async () => {
    useAuthStore.setState({
      status: {
        authenticated: true,
        oauthConfigured: true,
        displayName: 'Creator',
        email: 'creator@example.com'
      },
      loading: false,
      error: null
    })

    window.api = createMockApi({
      auth: {
        status: vi.fn().mockResolvedValue({
          authenticated: true,
          oauthConfigured: true,
          displayName: 'Creator',
          email: 'creator@example.com'
        }),
        login: vi.fn(),
        logout: vi.fn()
      },
      youtube: {
        getBroadcasts: vi.fn().mockResolvedValue([])
      },
      sessions: {
        list: vi.fn().mockResolvedValue([])
      }
    }) as Window['api']

    render(<DashboardShell />)

    await userEvent.click(await screen.findByRole('button', { name: /session history/i }))

    expect(screen.getByText('Monitoring idle')).toBeInTheDocument()
    expect(screen.queryByText('Connected creator')).not.toBeInTheDocument()
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

  it('renders the approved settings layout and persists updated controls', async () => {
    const update = vi.fn().mockImplementation(async (patch: Partial<AppPreferences>) => ({
      ...DEFAULT_PREFERENCES,
      ...patch
    }))

    window.api = createMockApi({
      settings: {
        get: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES),
        update
      }
    }) as Window['api']

    useAuthStore.setState({
      status: {
        authenticated: true,
        oauthConfigured: true,
        displayName: 'MyCreatorChannel',
        avatarUrl: 'https://example.com/avatar.png'
      },
      loading: false,
      error: null
    })
    useSettingsStore.setState({
      preferences: DEFAULT_PREFERENCES,
      appMeta: { name: 'ChatControl', version: '2.4.1' },
      loading: false,
      appMetaLoading: false,
      error: null,
      saving: {},
      clearingData: false,
      clearDataConfirmOpen: false
    })

    render(<SettingsPanel />)

    expect(screen.getByText('Display')).toBeInTheDocument()
    expect(screen.getByText('Overlay')).toBeInTheDocument()
    expect(screen.getByText('Connected Account')).toBeInTheDocument()
    expect(screen.getByText('Danger Zone')).toBeInTheDocument()
    expect(screen.getByText('ChatControl v2.4.1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage permissions/i })).toBeDisabled()

    await userEvent.selectOptions(screen.getByLabelText(/preferred currency/i), 'EUR')
    await userEvent.selectOptions(screen.getByLabelText(/default sort order/i), 'highest')
    await userEvent.click(screen.getByRole('switch', { name: /compact mode/i }))
    fireEvent.change(screen.getByLabelText(/overlay opacity/i), { target: { value: '88' } })

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ preferredCurrency: 'EUR' })
    })
    expect(update).toHaveBeenCalledWith({ defaultSort: 'highest' })
    expect(update).toHaveBeenCalledWith({ compactMode: true })
    expect(update).toHaveBeenCalledWith({ overlayOpacity: 88 })
  })

  it('requests notification permission before enabling desktop alerts', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission
    })

    const update = vi.fn().mockImplementation(async (patch: Partial<AppPreferences>) => ({
      ...DEFAULT_PREFERENCES,
      desktopNotificationsEnabled: false,
      ...patch
    }))

    window.api = createMockApi({
      settings: {
        get: vi.fn().mockResolvedValue({
          ...DEFAULT_PREFERENCES,
          desktopNotificationsEnabled: false
        }),
        update
      }
    }) as Window['api']

    useSettingsStore.setState({
      preferences: {
        ...DEFAULT_PREFERENCES,
        desktopNotificationsEnabled: false
      },
      appMeta: { name: 'ChatControl', version: '2.4.1' },
      loading: false,
      appMetaLoading: false,
      error: null,
      saving: {},
      clearingData: false,
      clearDataConfirmOpen: false
    })

    render(<SettingsPanel />)

    await userEvent.click(screen.getByRole('switch', { name: /desktop notifications/i }))

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalled()
    })
    expect(update).toHaveBeenCalledWith({ desktopNotificationsEnabled: true })
  })

  it('requires confirmation before clearing local data and disables it during active monitoring', async () => {
    const clearLocalData = vi.fn().mockResolvedValue(DEFAULT_PREFERENCES)
    window.api = createMockApi({
      settings: {
        clearLocalData
      }
    }) as Window['api']

    useSettingsStore.setState({
      preferences: DEFAULT_PREFERENCES,
      appMeta: { name: 'ChatControl', version: '2.4.1' },
      loading: false,
      appMetaLoading: false,
      error: null,
      saving: {},
      clearingData: false,
      clearDataConfirmOpen: false
    })

    render(<SettingsPanel />)

    await userEvent.click(screen.getByRole('button', { name: /clear data/i }))
    expect(screen.getByRole('button', { name: /confirm clear/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /confirm clear/i }))

    await waitFor(() => {
      expect(clearLocalData).toHaveBeenCalled()
    })

    cleanup()
    resetStores()
    useSettingsStore.setState({
      preferences: DEFAULT_PREFERENCES,
      appMeta: { name: 'ChatControl', version: '2.4.1' },
      loading: false,
      appMetaLoading: false,
      error: null,
      saving: {},
      clearingData: false,
      clearDataConfirmOpen: false
    })
    useStreamStore.setState({
      ...useStreamStore.getState(),
      activeSession: createSession()
    })

    render(<SettingsPanel />)

    expect(screen.getByRole('button', { name: /clear data/i })).toBeDisabled()
    expect(
      screen.getByText(/Stop active monitoring before clearing local data/i)
    ).toBeInTheDocument()
  })
})
