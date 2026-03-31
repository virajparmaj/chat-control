import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Link2,
  Loader2,
  Play,
  Radio,
  RefreshCw,
  Square,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useStreamStore } from '../../store/stream'
import { useAuthStore } from '../../store/auth'
import { useSuperchatStore } from '../../store/superchats'
import { formatCurrency } from '../../lib/currency'
import { useSettingsStore } from '../../store/settings'
import type { StreamStatusEvent } from '../../../../shared/ipc-types'
import { StreamSourceBadge } from './StreamSourceBadge'

export function StreamInfo(): React.JSX.Element {
  const authStatus = useAuthStore((state) => state.status)
  const broadcasts = useStreamStore((state) => state.broadcasts)
  const resolvedTarget = useStreamStore((state) => state.resolvedTarget)
  const activeSession = useStreamStore((state) => state.activeSession)
  const streamStatus = useStreamStore((state) => state.streamStatus)
  const loading = useStreamStore((state) => state.loading)
  const loadingContext = useStreamStore((state) => state.loadingContext)
  const error = useStreamStore((state) => state.error)
  const errorContext = useStreamStore((state) => state.errorContext)
  const fetchBroadcasts = useStreamStore((state) => state.fetchBroadcasts)
  const resolveTarget = useStreamStore((state) => state.resolveTarget)
  const clearResolvedTarget = useStreamStore((state) => state.clearResolvedTarget)
  const clearError = useStreamStore((state) => state.clearError)
  const startSession = useStreamStore((state) => state.startSession)
  const startSessionFromTarget = useStreamStore((state) => state.startSessionFromTarget)
  const stopSession = useStreamStore((state) => state.stopSession)

  const stats = useSuperchatStore((state) => state.stats)
  const preferences = useSettingsStore((state) => state.preferences)

  const [refreshing, setRefreshing] = useState(false)
  const [showTargetMonitor, setShowTargetMonitor] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  useEffect(() => {
    if (authStatus.authenticated) {
      void fetchBroadcasts()
    }
  }, [authStatus.authenticated, fetchBroadcasts])

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true)
    try {
      await fetchBroadcasts()
    } finally {
      setRefreshing(false)
    }
  }

  const handleTargetInputChange = (value: string): void => {
    setTargetInput(value)
    clearResolvedTarget()
    if (errorContext === 'target') {
      clearError()
    }
  }

  const handleResolveTarget = async (): Promise<void> => {
    await resolveTarget(targetInput)
  }

  const displayCurrency =
    activeSession?.convertedCurrency ?? stats.convertedCurrency ?? preferences.preferredCurrency
  const creatorError = errorContext === 'creator' ? error : null
  const targetError = errorContext === 'target' ? error : null
  const generalError = errorContext === null ? error : null
  const creatorLoading = loading && loadingContext === 'creator'
  const targetLoading = loading && loadingContext === 'target'

  if (!authStatus.authenticated) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-bold">Stream Monitor</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Sign in with YouTube to start tracking Super Chats.
        </p>
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Radio className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Not connected</p>
        </div>
      </div>
    )
  }

  if (activeSession) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-bold">Live Session</h1>
        <div className="mb-6 flex items-center gap-2">
          <p className="min-w-0 truncate text-sm text-muted-foreground">{activeSession.title}</p>
          <StreamSourceBadge sourceMode={activeSession.sourceMode} />
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusDot status={streamStatus} />
              <span className="text-sm font-medium">{getStatusLabel(streamStatus)}</span>
            </div>
            <button
              onClick={() => void stopSession()}
              className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Total" value={formatCurrency(stats.totalConverted, displayCurrency)} />
            <StatTile label="Unread" value={String(stats.unreadCount)} />
            <StatTile label="Saved" value={String(stats.savedCount)} />
          </div>
        </div>

        {generalError && <InlineError message={generalError} />}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="mb-1 text-xl font-bold">Stream Monitor</h1>
        <p className="text-sm text-muted-foreground">
          Monitor one of your active livestreams, or resolve a public live stream by URL below.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-sm font-semibold">My Active Streams</h2>
              <StreamSourceBadge sourceMode="creator_broadcast" />
            </div>
            <p className="text-xs text-muted-foreground">
              This stays the default creator workflow.
            </p>
          </div>
          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing || creatorLoading}
            className="rounded-lg p-2 transition-colors hover:bg-secondary disabled:opacity-50"
            title="Refresh broadcasts"
          >
            <RefreshCw
              className={`h-4 w-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {creatorLoading && broadcasts.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-background/40 p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Radio className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No active livestreams found</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Start a stream on YouTube, then refresh.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{broadcast.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {broadcast.actualStartTime
                        ? `Started ${new Date(broadcast.actualStartTime).toLocaleTimeString()}`
                        : 'Live'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void startSession(broadcast.id)}
                  disabled={creatorLoading}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Play className="h-3 w-3" />
                  Monitor
                </button>
              </div>
            ))}
          </div>
        )}

        {creatorError && (
          <div className="mt-4">
            <InlineError message={creatorError} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-border bg-card/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-sm font-semibold">Monitor by URL/Video ID</h2>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                Beta
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Secondary path for public livestreams with an active YouTube live chat.
            </p>
          </div>
          <button
            onClick={() => setShowTargetMonitor((current) => !current)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
          >
            <Link2 className="h-3.5 w-3.5" />
            {showTargetMonitor ? 'Hide' : 'Open'}
          </button>
        </div>

        {showTargetMonitor && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={targetInput}
                onChange={(event) => handleTargetInputChange(event.target.value)}
                placeholder="Paste a watch URL, youtu.be URL, or 11-character video ID"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <button
                onClick={() => void handleResolveTarget()}
                disabled={targetLoading || targetInput.trim().length === 0}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {targetLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Resolve
              </button>
            </div>

            {targetError && <InlineError message={targetError} />}

            {resolvedTarget && (
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      <StreamSourceBadge sourceMode={resolvedTarget.sourceMode} />
                    </div>
                    <p className="truncate text-sm font-semibold">{resolvedTarget.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resolvedTarget.channelTitle}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {resolvedTarget.actualStartTime
                        ? `Live since ${new Date(resolvedTarget.actualStartTime).toLocaleTimeString()}`
                        : 'Live now'}
                    </p>
                  </div>
                  <button
                    onClick={() => void startSessionFromTarget(resolvedTarget)}
                    disabled={targetLoading}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Play className="h-3 w-3" />
                    Monitor Stream
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {generalError && <InlineError message={generalError} />}
    </div>
  )
}

function InlineError({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="text-xs text-destructive">{message}</p>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-secondary/50 p-3 text-center">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function StatusDot({ status }: { status: StreamStatusEvent | null }): React.JSX.Element {
  if (!status || status.type === 'connected' || status.type === 'polling') {
    return <Wifi className="h-4 w-4 text-green-400" />
  }

  if (status.type === 'reconnecting') {
    return <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
  }

  return <WifiOff className="h-4 w-4 text-red-400" />
}

function getStatusLabel(status: StreamStatusEvent | null): string {
  if (!status) return 'Connecting...'

  switch (status.type) {
    case 'connected':
    case 'polling':
      return 'Connected'
    case 'reconnecting':
      return `Reconnecting (attempt ${status.attempt})...`
    case 'error':
      return status.message
    case 'ended':
      return 'Stream ended'
    default:
      return 'Unknown'
  }
}
