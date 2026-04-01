import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Clock3, Link2, Radio, RefreshCw } from 'lucide-react'
import { useStreamStore } from '../../store/stream'
import { useAuthStore } from '../../store/auth'
import { formatCompactCurrency } from '../../lib/currency'
import { useSettingsStore } from '../../store/settings'
import type { BroadcastInfo } from '../../../../shared/ipc-types'
import { LiveSessionCommand } from './LiveSessionCommand'

export function StreamInfo(): React.JSX.Element {
  const authStatus = useAuthStore((state) => state.status)
  const broadcasts = useStreamStore((state) => state.broadcasts)
  const resolvedTarget = useStreamStore((state) => state.resolvedTarget)
  const activeSession = useStreamStore((state) => state.activeSession)
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

  const preferences = useSettingsStore((state) => state.preferences)

  const [refreshing, setRefreshing] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [todayStats, setTodayStats] = useState({
    sessions: 0,
    superChats: 0,
    totalRaised: 0,
    currency: preferences.preferredCurrency
  })
  const [todayStatsLoading, setTodayStatsLoading] = useState(false)
  const targetInputRef = useRef<HTMLInputElement>(null)

  const loadTodayStats = useCallback(async (): Promise<void> => {
    if (!authStatus.authenticated) {
      setTodayStats({
        sessions: 0,
        superChats: 0,
        totalRaised: 0,
        currency: preferences.preferredCurrency
      })
      return
    }

    setTodayStatsLoading(true)
    try {
      const sessions = await window.api.sessions.list()
      const now = new Date()
      const todaysSessions = sessions.filter((session) => isSameLocalDay(session.startedAt, now))
      const currency =
        todaysSessions.find((session) => session.convertedCurrency)?.convertedCurrency ??
        preferences.preferredCurrency

      setTodayStats({
        sessions: todaysSessions.length,
        superChats: todaysSessions.reduce((sum, session) => sum + session.messageCount, 0),
        totalRaised: todaysSessions.reduce((sum, session) => sum + session.totalConverted, 0),
        currency
      })
    } catch {
      setTodayStats({
        sessions: 0,
        superChats: 0,
        totalRaised: 0,
        currency: preferences.preferredCurrency
      })
    } finally {
      setTodayStatsLoading(false)
    }
  }, [authStatus.authenticated, preferences.preferredCurrency])

  useEffect(() => {
    if (authStatus.authenticated) {
      void (async () => {
        await Promise.all([fetchBroadcasts(), loadTodayStats()])
        setLastSyncedAt(new Date())
      })()
    }
  }, [authStatus.authenticated, fetchBroadcasts, loadTodayStats])

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true)
    try {
      await Promise.all([fetchBroadcasts(), loadTodayStats()])
      setLastSyncedAt(new Date())
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

  const creatorError = errorContext === 'creator' ? error : null
  const targetError = errorContext === 'target' ? error : null
  const generalError = errorContext === null ? error : null
  const creatorErrorMessage = creatorError ? formatStreamErrorMessage(creatorError) : null
  const targetErrorMessage = targetError ? formatStreamErrorMessage(targetError) : null
  const generalErrorMessage = generalError ? formatStreamErrorMessage(generalError) : null
  const creatorLoading = loading && loadingContext === 'creator'
  const targetLoading = loading && loadingContext === 'target'
  const sortedBroadcasts = useMemo(() => {
    return [...broadcasts].sort((left, right) => {
      const leftTime = new Date(left.actualStartTime ?? left.scheduledStartTime ?? 0).getTime()
      const rightTime = new Date(right.actualStartTime ?? right.scheduledStartTime ?? 0).getTime()
      return rightTime - leftTime
    })
  }, [broadcasts])
  const liveBroadcasts = sortedBroadcasts.filter((broadcast) => isLiveBroadcast(broadcast))
  const scheduledBroadcasts = sortedBroadcasts.filter((broadcast) => !isLiveBroadcast(broadcast))
  const recommendedBroadcast = liveBroadcasts[0] ?? null
  const secondaryBroadcasts = liveBroadcasts.slice(1)
  const quotaExhausted = [creatorError, targetError, generalError, activeSession?.lastError]
    .filter(Boolean)
    .some((message) => isQuotaError(message ?? null))
  const commandFocusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3f6fa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d12] focus-visible:shadow-[0_0_0_4px_rgba(225,29,46,0.35)]'
  const utilityButtonClass = `inline-flex h-[34px] items-center justify-center rounded-[10px] border border-[#263142] bg-[#18212d] px-5 text-[13px] font-medium text-[#a9b3c1] transition-colors duration-150 hover:border-[#314056] hover:bg-[#1c2431] disabled:cursor-not-allowed disabled:opacity-50 ${commandFocusRing}`
  const primaryButtonClass = `inline-flex h-[40px] items-center justify-center rounded-[10px] bg-[#e11d2e] px-6 text-[14px] font-semibold text-[#fff4f5] transition-colors duration-150 hover:bg-[#f03a49] disabled:cursor-not-allowed disabled:opacity-50 ${commandFocusRing}`
  const liveButtonClass = `inline-flex h-[34px] min-w-[120px] items-center justify-center rounded-[8px] bg-[#e11d2e] px-[18px] text-[13px] font-semibold text-[#fff4f5] transition-colors duration-150 hover:bg-[#f03a49] disabled:cursor-not-allowed disabled:opacity-50 ${commandFocusRing}`
  const secondaryMonitorButtonClass = `inline-flex h-[34px] min-w-[94px] items-center justify-center rounded-[8px] border border-[#2f3a4a] bg-[#171d26] px-4 text-[12px] font-semibold text-[#d9e1eb] transition-colors duration-150 hover:border-[#425267] hover:bg-[#1b2430] disabled:cursor-not-allowed disabled:opacity-50 ${commandFocusRing}`
  const tertiaryButtonClass = `inline-flex h-[26px] min-w-[91px] items-center justify-center rounded-[8px] border border-[#2b3647] px-4 text-[10px] font-medium text-[#7f8b9a] transition-colors duration-150 hover:border-[#3d4b60] hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50 ${commandFocusRing}`
  const sectionCardClass =
    'rounded-[18px] border border-[#243041] bg-[#121821] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]'
  const apiStatus = !authStatus.authenticated
    ? {
        label: 'Disconnected',
        subtitle: 'YouTube API',
        tone: 'error' as const
      }
    : creatorError
      ? {
          label: quotaExhausted ? 'Rate Limited' : 'Attention',
          subtitle: 'YouTube API',
          tone: quotaExhausted ? ('warning' as const) : ('error' as const)
        }
      : { label: 'Connected', subtitle: 'YouTube API', tone: 'success' as const }
  const oauthStatus = authStatus.authenticated
    ? {
        label: 'Authorized',
        subtitle: 'Channel OAuth',
        tone: 'success' as const
      }
    : {
        label: 'Expired',
        subtitle: 'Channel OAuth',
        tone: 'error' as const
      }
  const quotaStatus = {
    label: '--',
    subtitle: 'API Quota Left',
    tone: quotaExhausted ? ('warning' as const) : ('neutral' as const)
  }

  if (!authStatus.authenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display mb-2 text-[2rem] font-semibold tracking-[-0.04em]">
            Stream Monitor
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with YouTube to start tracking Super Chats.
          </p>
        </div>
        <div className="rounded-[22px] border border-[#263142] bg-[#121821] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <Radio className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-[#f3f6fa]">YouTube is not connected</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Authenticate in ChatControl to unlock active stream discovery and public stream resolve.
          </p>
        </div>
      </div>
    )
  }

  if (activeSession) {
    return <LiveSessionCommand onStop={stopSession} loading={loading} error={generalError} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold tracking-[-0.04em] text-[#f3f6fa]">
            Stream Monitor
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-[#7f8c9d]">
            Detect and monitor YouTube livestreams
          </p>
        </div>
        <button
          onClick={() => void handleRefresh()}
          disabled={refreshing || creatorLoading || todayStatsLoading}
          className={`${utilityButtonClass} min-w-[96px] self-start`}
          title="Refresh broadcasts"
        >
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(356px,1fr)]">
        <section className={sectionCardClass}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="h-6 w-[3px] rounded-full bg-[#e11d2e]" />
                <h2 className="font-display text-[1.4rem] font-semibold tracking-[-0.03em] text-[#f3f6fa]">
                  My Active Streams
                </h2>
              </div>
              <p className="text-[13px] leading-5 text-[#8a95a4]">
                Automatically detected from your connected channel
              </p>
            </div>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing || creatorLoading}
              className={`inline-flex h-[28px] items-center gap-2 rounded-[8px] px-2.5 text-[12px] font-medium text-[#8f99a6] transition-colors hover:bg-white/[0.03] hover:text-[#dce4ee] disabled:opacity-50 ${commandFocusRing}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {creatorLoading && broadcasts.length === 0 ? (
            <div className="space-y-3">
              <BroadcastSkeleton featured />
              <ScheduledSkeleton />
              <OpenSlotPlaceholder />
            </div>
          ) : (
            <div className="space-y-3">
              {recommendedBroadcast ? (
                <>
                  <LiveBroadcastCard
                    broadcast={recommendedBroadcast}
                    featured
                    disabled={creatorLoading || quotaExhausted}
                    buttonLabel="Start Monitoring"
                    buttonClass={liveButtonClass}
                    onMonitor={(broadcastId) => void startSession(broadcastId)}
                  />
                  {secondaryBroadcasts.map((broadcast) => (
                    <LiveBroadcastCard
                      key={broadcast.id}
                      broadcast={broadcast}
                      disabled={creatorLoading || quotaExhausted}
                      buttonLabel="Monitor"
                      buttonClass={secondaryMonitorButtonClass}
                      onMonitor={(broadcastId) => void startSession(broadcastId)}
                    />
                  ))}
                </>
              ) : (
                <div className="rounded-[14px] border border-dashed border-[#293546] bg-[#111821] px-6 py-7 text-center">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
                    <Radio className="h-5 w-5 text-[#7f8c9d]" />
                  </div>
                  <p className="text-[17px] font-semibold text-[#cfd7e1]">
                    No active livestreams found
                  </p>
                  <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-5 text-[#7f8c9d]">
                    Start a stream on YouTube, then refresh or resolve any public livestream from
                    the right rail.
                  </p>
                  <button
                    onClick={() => targetInputRef.current?.focus()}
                    className={`mt-4 text-[13px] font-medium text-[#d7dee7] underline decoration-[#445570] underline-offset-4 transition-colors hover:text-[#f3f6fa] ${commandFocusRing}`}
                  >
                    Use the URL resolver
                  </button>
                </div>
              )}

              {scheduledBroadcasts.map((broadcast) => (
                <ScheduledBroadcastCard
                  key={broadcast.id}
                  broadcast={broadcast}
                  buttonClass={tertiaryButtonClass}
                />
              ))}

              <OpenSlotPlaceholder />
            </div>
          )}

          {creatorErrorMessage && (
            <div className="mt-4">
              <InlineError message={creatorErrorMessage} />
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className={sectionCardClass}>
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-3">
                <span className="h-6 w-[3px] rounded-full bg-[#57a0ff]" />
                <h2 className="font-display text-[1.4rem] font-semibold tracking-[-0.03em] text-[#f3f6fa]">
                  Monitor Any Livestream
                </h2>
              </div>
              <p className="max-w-[540px] text-[13px] leading-5 text-[#8a95a4]">
                Enter a YouTube livestream URL or video ID to monitor Super Chats from any public
                stream
              </p>
            </div>

            <label className="mb-2 block text-[12px] font-medium text-[#9ba7b8]">
              Livestream URL or Video ID
            </label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8c9d]" />
              <input
                ref={targetInputRef}
                value={targetInput}
                onChange={(event) => handleTargetInputChange(event.target.value)}
                placeholder="youtube.com/watch?v=... or video ID"
                className={`min-w-0 w-full rounded-[11px] border border-[#263142] bg-[#0d131a] py-[10px] pl-11 pr-4 text-[14px] text-[#f3f6fa] placeholder:text-[#6f7b8d] transition-colors focus:border-[#e11d2e] ${commandFocusRing}`}
              />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <button
                onClick={() => void handleResolveTarget()}
                disabled={targetLoading || targetInput.trim().length === 0 || quotaExhausted}
                className={`${primaryButtonClass} min-w-[138px] px-5 self-start sm:self-auto`}
              >
                {targetLoading ? 'Resolving' : 'Resolve Stream'}
              </button>
              <p className="text-[13px] leading-5 text-[#7f8c9d]">
                We&apos;ll verify the stream is live and show details
              </p>
            </div>

            {targetErrorMessage && (
              <div className="mt-4">
                <InlineError message={targetErrorMessage} />
              </div>
            )}

            {resolvedTarget && (
              <div className="mt-4 rounded-[14px] border border-[#263142] bg-[#151d28] p-4">
                <p className="truncate text-[18px] font-semibold text-[#f3f6fa]">
                  {resolvedTarget.title}
                </p>
                <p className="mt-1 text-[13px] text-[#8a95a4]">{resolvedTarget.channelTitle}</p>
                <p className="mt-2 text-[12px] text-[#8a95a4]">
                  {resolvedTarget.actualStartTime
                    ? formatRelativeSync(new Date(resolvedTarget.actualStartTime), 'Live since')
                    : 'Live now'}
                </p>
                <button
                  onClick={() => void startSessionFromTarget(resolvedTarget)}
                  disabled={targetLoading || quotaExhausted}
                  className={`${liveButtonClass} mt-4`}
                >
                  Start Monitoring
                </button>
              </div>
            )}
          </section>

          <section className={sectionCardClass}>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-6 w-[3px] rounded-full bg-[#1fd0b3]" />
              <h2 className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-[#f3f6fa]">
                Connection Status
              </h2>
            </div>

            {creatorLoading && !lastSyncedAt ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <ConnectionSkeleton />
                <ConnectionSkeleton />
                <ConnectionSkeleton />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <ConnectionTile
                  title={apiStatus.subtitle}
                  label={apiStatus.label}
                  tone={apiStatus.tone}
                />
                <ConnectionTile
                  title={oauthStatus.subtitle}
                  label={oauthStatus.label}
                  tone={oauthStatus.tone}
                />
                <ConnectionTile
                  title={quotaStatus.subtitle}
                  label={quotaStatus.label}
                  tone={quotaStatus.tone}
                  hideDot
                />
              </div>
            )}
          </section>

          <section className={sectionCardClass}>
            <div className="mb-4">
              <h2 className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-[#f3f6fa]">
                Today&apos;s Stats
              </h2>
            </div>

            {todayStatsLoading && !lastSyncedAt ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
              </div>
            ) : (
              <div className="grid overflow-hidden rounded-[14px] border border-[#2d394b] bg-[#151d28] sm:grid-cols-3">
                <KpiTile label="Sessions" value={String(todayStats.sessions)} accent="danger" />
                <KpiTile
                  label="Super Chats"
                  value={Intl.NumberFormat('en-US').format(todayStats.superChats)}
                  bordered
                />
                <KpiTile
                  label="Total Raised"
                  value={formatCompactCurrency(todayStats.totalRaised, todayStats.currency)}
                  accent="success"
                  bordered
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {generalErrorMessage && <InlineError message={generalErrorMessage} />}
    </div>
  )
}

function LiveBroadcastCard({
  broadcast,
  featured = false,
  disabled,
  buttonLabel,
  buttonClass,
  onMonitor
}: {
  broadcast: BroadcastInfo
  featured?: boolean
  disabled: boolean
  buttonLabel: string
  buttonClass: string
  onMonitor: (broadcastId: string) => void
}): React.JSX.Element {
  const rowClass = featured
    ? 'border-[#263142] bg-[#171f2a]'
    : 'border-[#263142] bg-[#151d28] hover:border-[#314056]'

  return (
    <div
      className={`group relative overflow-hidden rounded-[14px] border px-4 py-[13px] transition-colors duration-150 ${rowClass}`}
    >
      <div className="absolute inset-y-4 left-0 w-[3px] rounded-full bg-[#e11d2e]" />
      <div className="flex items-start justify-between gap-4 pl-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[12px]">
            <div className="flex flex-wrap items-center gap-2 text-[#9aa5b5]">
              <span className="rounded-[6px] bg-[#42171d] px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-[#ffb0b7]">
                Live
              </span>
              <span>
                {broadcast.actualStartTime
                  ? formatRelativeSync(new Date(broadcast.actualStartTime), 'Started')
                  : 'Live now'}
              </span>
            </div>
            <span className="shrink-0 text-[#9aa5b5]">Live chat ready</span>
          </div>
          <p className="truncate text-[1.22rem] font-semibold leading-[1.2] tracking-[-0.03em] text-[#f3f6fa]">
            {broadcast.title}
          </p>
          <div className="mt-3 flex flex-wrap gap-6">
            <MetricPair label="Super Chats" value="Ready to track" />
            <MetricPair
              label="Elapsed"
              value={
                broadcast.actualStartTime ? formatElapsedTime(broadcast.actualStartTime) : 'Live'
              }
              accent="default"
            />
          </div>
        </div>

        <button
          onClick={() => onMonitor(broadcast.id)}
          disabled={disabled}
          className={`${buttonClass} shrink-0 self-center`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

function ScheduledBroadcastCard({
  broadcast,
  buttonClass
}: {
  broadcast: BroadcastInfo
  buttonClass: string
}): React.JSX.Element {
  const isPremiere =
    broadcast.status.toLowerCase().includes('complete') ||
    broadcast.status.toLowerCase().includes('testing')

  return (
    <div className="rounded-[14px] border border-[#263142] bg-[#151d28] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
            <span
              className={`rounded-[6px] px-2.5 py-1 font-semibold uppercase tracking-[0.14em] ${
                isPremiere ? 'bg-[#3b2a12] text-[#f1c76d]' : 'bg-[#182130] text-[#c5d0dd]'
              }`}
            >
              {isPremiere ? 'Premiere' : 'Scheduled'}
            </span>
            <span className="flex items-center gap-1 text-[#98a4b3]">
              <Clock3 className="h-3.5 w-3.5" />
              {broadcast.scheduledStartTime
                ? `Starts ${new Date(broadcast.scheduledStartTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : 'Waiting room open'}
            </span>
          </div>
          <p className="truncate text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.03em] text-[#f3f6fa]">
            {broadcast.title}
          </p>
          <p className="mt-2 text-[13px] leading-5 text-[#7f8c9d]">
            {broadcast.scheduledStartTime
              ? formatScheduledDate(broadcast.scheduledStartTime)
              : 'Waiting room open'}
          </p>
        </div>
        <button disabled title="Coming soon" className={`${buttonClass} shrink-0 self-center`}>
          Notify Me
        </button>
      </div>
    </div>
  )
}

function InlineError({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-[16px] border border-[#6f1d25] bg-[#2a1418] p-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#f6727d]" />
      <p className="min-w-0 break-words text-sm leading-6 text-[#ffc8cd]">
        {formatStreamErrorMessage(message)}
      </p>
    </div>
  )
}

function MetricPair({
  label,
  value,
  accent = 'default'
}: {
  label: string
  value: string
  accent?: 'default' | 'success'
}): React.JSX.Element {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8592a4]">
        {label}
      </p>
      <p
        className={`mt-1 text-[15px] font-semibold leading-[1.3] ${accent === 'success' ? 'text-[#18b777]' : 'text-[#f3f6fa]'}`}
      >
        {value}
      </p>
    </div>
  )
}

function BroadcastSkeleton({ featured = false }: { featured?: boolean }): React.JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-[18px] border border-[#2a3648] ${featured ? 'bg-[#171f29] p-5' : 'bg-[#141b24] p-4'}`}
    >
      <div className="mb-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-white/8" />
        <div className="h-6 w-32 rounded-full bg-white/5" />
      </div>
      <div className="h-6 w-3/4 rounded bg-white/8" />
      <div className="mt-4 flex gap-4">
        <div className="h-10 w-28 rounded bg-white/6" />
        <div className="h-10 w-28 rounded bg-white/6" />
      </div>
    </div>
  )
}

function ScheduledSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse rounded-[18px] border border-[#2a3648] bg-[#141b24] p-5">
      <div className="mb-3 h-5 w-24 rounded-full bg-white/8" />
      <div className="h-5 w-2/3 rounded bg-white/8" />
      <div className="mt-3 h-4 w-40 rounded bg-white/6" />
    </div>
  )
}

function OpenSlotPlaceholder(): React.JSX.Element {
  return (
    <div className="rounded-[14px] border border-dashed border-[#293546] bg-[#111821] px-6 py-8 text-center">
      <div className="mx-auto mb-4 h-11 w-11 rounded-full bg-white/[0.05]" />
      <p className="text-[17px] font-semibold text-[#cfd7e1]">No other active streams</p>
      <p className="mx-auto mt-2 max-w-[270px] text-[13px] leading-5 text-[#7f8c9d]">
        When you go live on YouTube, your streams will appear here automatically
      </p>
    </div>
  )
}

function ConnectionSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse rounded-[14px] border border-[#2a3648] bg-[#151d28] p-4">
      <div className="mb-3 h-3 w-24 rounded bg-white/10" />
      <div className="mt-2 h-7 w-28 rounded bg-white/12" />
      <div className="mt-3 h-4 w-24 rounded bg-white/6" />
    </div>
  )
}

function KpiSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse rounded-[14px] border border-[#2a3648] bg-[#151d28] px-5 py-6">
      <div className="mx-auto h-8 w-20 rounded bg-white/12" />
      <div className="mx-auto mt-4 h-3 w-16 rounded bg-white/8" />
    </div>
  )
}

function ConnectionTile({
  title,
  label,
  tone,
  hideDot = false
}: {
  title: string
  label: string
  tone: 'success' | 'error' | 'warning' | 'neutral'
  hideDot?: boolean
}): React.JSX.Element {
  const toneClasses = getToneClasses(tone)

  return (
    <div className="flex min-h-[108px] flex-col justify-between rounded-[14px] border border-[#2d394b] bg-[#151d28] px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#98a4b3]">
        {title}
      </p>
      <div className="mt-1.5 min-w-0">
        <div className="flex items-center gap-2">
          {!hideDot && <span className={`h-2.5 w-2.5 rounded-full ${toneClasses.dot}`} />}
          <p
            className={`min-w-0 break-words text-[1.5rem] font-semibold leading-[1.1] tracking-[-0.03em] ${toneClasses.text}`}
          >
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}

function KpiTile({
  label,
  value,
  accent = 'default',
  bordered = false
}: {
  label: string
  value: string
  accent?: 'default' | 'danger' | 'success'
  bordered?: boolean
}): React.JSX.Element {
  const valueClass =
    accent === 'success'
      ? 'text-[#18b777]'
      : accent === 'danger'
        ? 'text-[#e11d2e]'
        : 'text-[#f3f6fa]'

  return (
    <div
      className={`flex min-h-[132px] flex-col items-center justify-center px-5 py-6 text-center ${
        bordered ? 'border-t border-[#2d394b] sm:border-l sm:border-t-0' : ''
      }`}
    >
      <p className={`text-[2.15rem] font-semibold leading-none tracking-[-0.04em] ${valueClass}`}>
        {value}
      </p>
      <p className="mt-3 text-[13px] font-medium text-[#8f9bad]">{label}</p>
    </div>
  )
}

function getToneClasses(tone: 'success' | 'error' | 'warning' | 'neutral'): {
  dot: string
  text: string
} {
  switch (tone) {
    case 'success':
      return { dot: 'bg-[#18b777]', text: 'text-[#2ad89a]' }
    case 'error':
      return { dot: 'bg-[#f04452]', text: 'text-[#ff8d97]' }
    case 'warning':
      return { dot: 'bg-[#d9a441]', text: 'text-[#e3ba63]' }
    default:
      return { dot: 'bg-[#738397]', text: 'text-[#f3f6fa]' }
  }
}

function formatStreamErrorMessage(message: string): string {
  const withoutAnchorTags = message.replace(/<a\b[^>]*>(.*?)<\/a>/giu, '$1')
  const withoutHtml = withoutAnchorTags.replace(/<\/?[^>]+>/gu, ' ')
  return decodeHtmlEntities(withoutHtml).replace(/\s+/gu, ' ').trim()
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

function isQuotaError(message: string | null): boolean {
  if (!message) return false
  const normalized = message.toLowerCase()
  return normalized.includes('quota') || normalized.includes('ratelimit')
}

function isLiveBroadcast(broadcast: BroadcastInfo): boolean {
  return Boolean(broadcast.actualStartTime) || broadcast.status.toLowerCase().includes('live')
}

function isSameLocalDay(dateValue: string, compareDate: Date): boolean {
  const date = new Date(dateValue)
  return (
    date.getFullYear() === compareDate.getFullYear() &&
    date.getMonth() === compareDate.getMonth() &&
    date.getDate() === compareDate.getDate()
  )
}

function formatRelativeSync(date: Date, prefix: string): string {
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000))

  if (diffMinutes < 1) return `${prefix} just now`
  if (diffMinutes < 60) return `${prefix} ${diffMinutes}m ago`

  const diffHours = Math.round(diffMinutes / 60)
  return `${prefix} ${diffHours}h ago`
}

function formatElapsedTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime()
  const totalMinutes = Math.max(1, Math.floor(diffMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatScheduledDate(value: string): string {
  const date = new Date(value)
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString(
    [],
    {
      hour: 'numeric',
      minute: '2-digit'
    }
  )}`
}
