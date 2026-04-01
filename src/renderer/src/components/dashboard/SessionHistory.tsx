import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, CircleAlert, Download, History } from 'lucide-react'
import { formatCurrency } from '../../lib/currency'
import { useAuthStore } from '../../store/auth'
import { useStreamStore } from '../../store/stream'
import { useSuperchatStore } from '../../store/superchats'
import type { SessionReport, SessionStats, StreamSession } from '../../../../shared/ipc-types'
import { SessionReportView } from './SessionReportView'
import { StreamSourceBadge } from './StreamSourceBadge'

type DateRangeOption = 'last7' | 'last30' | 'last90' | 'all'
type GroupKey = 'today' | 'yesterday' | 'thisWeek' | 'earlier'
type RowVariant = 'live' | 'ended' | 'error'

interface HistoryEntry {
  session: StreamSession
  channelLabel: string
  chatCount: number
  stickerCount: number
  totalConverted: number
  convertedCurrency: string
  actionLabel: string
  variant: RowVariant
}

const DATE_RANGE_OPTIONS: Array<{ value: DateRangeOption; label: string }> = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' }
]

const GROUP_LABELS: Record<GroupKey, string> = {
  today: 'TODAY',
  yesterday: 'YESTERDAY',
  thisWeek: 'THIS WEEK',
  earlier: 'EARLIER'
}

const GROUP_ORDER: GroupKey[] = ['today', 'yesterday', 'thisWeek', 'earlier']

const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3f6fa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d12] focus-visible:shadow-[0_0_0_3px_rgba(225,29,46,0.28)]'

const controlClass = `inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#232d3c] bg-[#151d28] px-4 text-[13px] font-medium text-[#d7dee7] transition-all duration-150 hover:border-[#314056] hover:bg-[#18202c] ${focusRingClass}`

export function SessionHistory(): React.JSX.Element {
  const [sessions, setSessions] = useState<StreamSession[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [report, setReport] = useState<SessionReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('last30')
  const [headerFeedback, setHeaderFeedback] = useState<string | null>(null)
  const [clock, setClock] = useState(Date.now())

  const authStatus = useAuthStore((state) => state.status)
  const activeSession = useStreamStore((state) => state.activeSession)
  const liveStats = useSuperchatStore((state) => state.stats)

  const loadSessions = useCallback(async (): Promise<void> => {
    setLoading(true)
    setListError(null)
    try {
      setSessions(await window.api.sessions.list())
    } catch (error: unknown) {
      setSessions([])
      setListError(
        error instanceof Error ? error.message : 'Unable to load your session history right now.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReport = useCallback(async (sessionId: string): Promise<void> => {
    setReportLoading(true)
    setReportError(null)
    try {
      const data = await window.api.sessions.report(sessionId)
      setReport(data)
      if (!data) setReportError('This session report is no longer available in local history.')
    } catch (error: unknown) {
      setReport(null)
      setReportError(
        error instanceof Error ? error.message : 'Unable to load this stream summary right now.'
      )
    } finally {
      setReportLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!headerFeedback) return
    const timeout = window.setTimeout(() => setHeaderFeedback(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [headerFeedback])

  const handleOpenSession = async (sessionId: string): Promise<void> => {
    setSelectedSessionId(sessionId)
    setReport(null)
    await loadReport(sessionId)
  }

  if (selectedSessionId) {
    return (
      <SessionReportView
        report={report}
        loading={reportLoading}
        error={reportError}
        onBack={() => {
          setSelectedSessionId(null)
          setReport(null)
          setReportError(null)
          setReportLoading(false)
        }}
        onRetry={() => {
          void loadReport(selectedSessionId)
        }}
      />
    )
  }

  const channelLabel = authStatus.displayName ?? 'My Channel'
  const entries = buildHistoryEntries(sessions, activeSession, liveStats, channelLabel)
  const filteredEntries = entries.filter((entry) =>
    isSessionWithinRange(entry.session.startedAt, selectedRange, clock)
  )
  const groupedEntries = groupEntries(filteredEntries, clock)
  const metrics = summarizeEntries(filteredEntries, clock)
  const emptyStateVariant = sessions.length > 0 || Boolean(activeSession) ? 'filtered' : 'history'

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-display text-[2.35rem] font-semibold tracking-[-0.05em] text-[#f4f7fb]">
            Session History
          </h1>
          <p className="mt-2 text-sm text-[#7f8c9d]">
            Archive of all your previous monitoring sessions
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 xl:items-end">
          <div className="flex items-center gap-3">
            <label className="relative">
              <span className="sr-only">Date range</span>
              <select
                aria-label="Date range"
                value={selectedRange}
                onChange={(event) => setSelectedRange(event.target.value as DateRangeOption)}
                className={`h-10 appearance-none rounded-[12px] border border-[#232d3c] bg-[#151d28] pl-4 pr-11 text-[13px] font-medium text-[#d7dee7] transition-all duration-150 hover:border-[#314056] ${focusRingClass}`}
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8c9d]" />
            </label>
            <button
              type="button"
              onClick={() =>
                setHeaderFeedback(
                  'Bulk export is coming soon. Use any session summary to export individual CSVs today.'
                )
              }
              className={controlClass}
            >
              <Download className="h-4 w-4" />
              Export All
            </button>
          </div>
          <p
            aria-live="polite"
            className={`min-h-[1rem] text-xs ${
              headerFeedback ? 'text-[#a9b6c8]' : 'text-transparent'
            }`}
          >
            {headerFeedback ?? 'Export individual sessions from the detailed summary view.'}
          </p>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[104px] animate-pulse rounded-[18px] border border-[#222b38] bg-[#111821]"
            />
          ))
        ) : (
          <>
            <SummaryStatCard label="Total Sessions" value={formatInteger(metrics.totalSessions)} />
            <SummaryStatCard
              label="Total Monitoring Time"
              value={formatDurationFromMinutes(metrics.durationMinutes)}
            />
            <SummaryStatCard
              label="Super Chats Tracked"
              value={formatInteger(metrics.totalChats)}
            />
            <SummaryStatCard
              label="Total Revenue Tracked"
              value={formatCurrency(metrics.totalRevenue, metrics.currency)}
              tone="revenue"
            />
          </>
        )}
      </section>

      {loading ? (
        <LoadingState />
      ) : listError ? (
        <div className="rounded-[24px] border border-[#5b1f29] bg-[#151920] p-6 shadow-[0_18px_52px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#6f1d25] bg-[#2a151a] text-[#ff8b96]">
                <CircleAlert className="h-5 w-5" />
              </div>
              <p className="text-lg font-semibold text-[#f4f7fb]">Session history unavailable</p>
              <p className="mt-2 text-sm leading-6 text-[#98a4b3]">{listError}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadSessions()}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#e11d2e] px-4 py-2.5 text-sm font-semibold text-[#fff4f5] transition-all duration-150 hover:bg-[#ef3342]"
            >
              Retry
            </button>
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <EmptyState variant={emptyStateVariant} />
      ) : (
        <div className="space-y-5">
          {GROUP_ORDER.map((groupKey) =>
            groupedEntries[groupKey].length > 0 ? (
              <section key={groupKey} className="space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#667384]">
                  {GROUP_LABELS[groupKey]}
                </p>
                <div className="space-y-3">
                  {groupedEntries[groupKey].map((entry) => (
                    <HistoryRow
                      key={entry.session.id}
                      entry={entry}
                      clock={clock}
                      onOpen={() => void handleOpenSession(entry.session.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

function SummaryStatCard({
  label,
  value,
  tone = 'default'
}: {
  label: string
  value: string
  tone?: 'default' | 'revenue'
}): React.JSX.Element {
  return (
    <article
      className={`rounded-[18px] border px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.2)] ${
        tone === 'revenue'
          ? 'border-[#52242d] bg-[linear-gradient(180deg,rgba(43,14,18,0.92),rgba(29,11,15,0.96))]'
          : 'border-[#222b38] bg-[#111821]'
      }`}
    >
      <p className="text-[12px] font-medium text-[#798597]">{label}</p>
      <p
        className={`mt-3 font-display text-[2rem] font-semibold tracking-[-0.05em] ${
          tone === 'revenue' ? 'text-[#20d4a2]' : 'text-[#f4f7fb]'
        }`}
      >
        {value}
      </p>
    </article>
  )
}

function HistoryRow({
  entry,
  clock,
  onOpen
}: {
  entry: HistoryEntry
  clock: number
  onOpen: () => void
}): React.JSX.Element {
  const rowClass =
    entry.variant === 'live'
      ? 'border-[#145641] bg-[linear-gradient(180deg,rgba(12,33,28,0.96),rgba(11,28,24,0.96))] hover:border-[#1b7357] hover:bg-[linear-gradient(180deg,rgba(16,40,34,0.98),rgba(13,33,28,0.98))]'
      : entry.variant === 'error'
        ? 'border-[#53242d] bg-[linear-gradient(180deg,rgba(25,15,19,0.98),rgba(23,12,16,0.98))] hover:border-[#68303a] hover:bg-[linear-gradient(180deg,rgba(30,17,22,0.99),rgba(28,14,19,0.99))]'
        : 'border-[#222b38] bg-[#121821] hover:border-[#314056] hover:bg-[#151d28]'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={entry.session.title ?? 'Untitled session'}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className={`group rounded-[18px] border px-4 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.18)] transition-all duration-150 ${rowClass} ${focusRingClass}`}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.35fr)_5.25rem_5.25rem_7rem_5.25rem_8.5rem] lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {entry.variant === 'live' && <LivePill />}
            <p className="truncate text-[1.05rem] font-semibold text-[#f4f7fb]">
              {entry.session.title ?? 'Untitled Stream'}
            </p>
            {entry.variant === 'error' && <ErrorChip />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#8e9bab]">
            <span className="font-medium text-[#cfd7e1]">{entry.channelLabel}</span>
            {entry.session.sourceMode === 'public_video' && (
              <StreamSourceBadge sourceMode={entry.session.sourceMode} compact />
            )}
            <span>
              {entry.variant === 'live'
                ? `Started ${formatElapsedSince(entry.session.startedAt, clock)} ago`
                : formatSessionStart(entry.session.startedAt)}
            </span>
            {entry.variant !== 'live' && entry.session.endedAt && (
              <span>{formatDuration(entry.session.startedAt, entry.session.endedAt)}</span>
            )}
            {entry.variant === 'error' && entry.session.lastError && (
              <span className="font-medium text-[#dd5c68]">{entry.session.lastError}</span>
            )}
          </div>
        </div>
        <MetricColumn label="Chats" value={formatInteger(entry.chatCount)} />
        <MetricColumn label="Stickers" value={formatInteger(entry.stickerCount)} />
        <MetricColumn
          label={entry.variant === 'error' ? 'Partial' : 'Raised'}
          value={formatCurrency(entry.totalConverted, entry.convertedCurrency)}
          tone={entry.variant === 'error' ? 'muted' : 'positive'}
        />
        <div className="flex items-center lg:justify-center">
          {entry.variant === 'live' ? null : (
            <StatusCapsule tone={entry.variant === 'error' ? 'error' : 'success'} />
          )}
        </div>
        <div className="flex items-center lg:justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpen()
            }}
            className={`${controlClass} w-full lg:w-auto`}
          >
            {entry.actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricColumn({
  label,
  value,
  tone = 'default'
}: {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'muted'
}): React.JSX.Element {
  return (
    <div className="text-left lg:text-center">
      <p
        className={`text-[1.75rem] font-semibold tracking-[-0.04em] ${
          tone === 'positive'
            ? 'text-[#20d4a2]'
            : tone === 'muted'
              ? 'text-[#aeb6c2]'
              : 'text-[#f4f7fb]'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px] text-[#7f8c9d]">{label}</p>
    </div>
  )
}

function LivePill(): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 rounded-[8px] border border-[#1f6f57] bg-[#114535] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64ddb2]">
      <span className="h-2 w-2 rounded-full bg-[#22d39d]" />
      Live
    </span>
  )
}

function ErrorChip(): React.JSX.Element {
  return (
    <span className="inline-flex items-center rounded-[6px] border border-[#5c2028] bg-[#3a151b] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#ef5564]">
      Error
    </span>
  )
}

function StatusCapsule({ tone }: { tone: 'success' | 'error' }): React.JSX.Element {
  return (
    <span
      className={`inline-flex h-5 min-w-[2.5rem] items-center justify-center rounded-full px-2 ${
        tone === 'error'
          ? 'border border-[#6a2b34] bg-[#35161c] text-[#ef5564]'
          : 'border border-[#185545] bg-[#11382f] text-[#38d5a4]'
      }`}
    >
      {tone === 'error' ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
    </span>
  )
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="space-y-5 animate-pulse">
      {['today', 'yesterday', 'thisWeek'].map((key, groupIndex) => (
        <div key={key} className="space-y-3">
          <div className="h-3 w-20 rounded-full bg-[#17202c]" />
          {Array.from({ length: groupIndex === 0 ? 1 : 2 }).map((_, index) => (
            <div
              key={index}
              className="h-[92px] rounded-[18px] border border-[#222b38] bg-[#111821]"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function EmptyState({ variant }: { variant: 'filtered' | 'history' }): React.JSX.Element {
  return (
    <div className="rounded-[26px] border border-dashed border-[#314056] bg-[#101720] px-8 py-14 text-center shadow-[0_18px_52px_rgba(0,0,0,0.2)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#98a4b3]">
        <History className="h-6 w-6" />
      </div>
      <h2 className="font-display mt-5 text-[1.65rem] font-semibold tracking-[-0.04em] text-[#f4f7fb]">
        {variant === 'filtered' ? 'No sessions in this range' : 'No sessions in history yet'}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#98a4b3]">
        {variant === 'filtered'
          ? 'Try a wider date range to review earlier monitoring sessions and archived totals.'
          : 'Once you monitor a livestream, ChatControl will store its summary here so you can revisit totals, donor insights, and exportable records.'}
      </p>
    </div>
  )
}

function buildHistoryEntries(
  sessions: StreamSession[],
  activeSession: StreamSession | null,
  liveStats: SessionStats,
  channelLabel: string
): HistoryEntry[] {
  const merged = [...sessions]
  if (activeSession) {
    const snapshot: StreamSession = {
      ...activeSession,
      messageCount: liveStats.messageCount,
      stickerCount: liveStats.stickerCount,
      totalConverted: liveStats.totalConverted,
      convertedCurrency: liveStats.convertedCurrency ?? activeSession.convertedCurrency
    }
    const index = merged.findIndex((session) => session.id === activeSession.id)
    if (index === -1) merged.unshift(snapshot)
    else merged[index] = snapshot
  }
  merged.sort((left, right) => {
    if (left.status === 'active' && right.status !== 'active') return -1
    if (right.status === 'active' && left.status !== 'active') return 1
    return new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()
  })
  return merged.map((session) => ({
    session,
    channelLabel,
    chatCount: Math.max(0, session.messageCount - session.stickerCount),
    stickerCount: session.stickerCount,
    totalConverted: session.totalConverted,
    convertedCurrency: session.convertedCurrency ?? 'USD',
    actionLabel:
      session.status === 'active'
        ? 'View Session'
        : session.status === 'error'
          ? 'View Details'
          : 'View Summary',
    variant: session.status === 'active' ? 'live' : session.status === 'error' ? 'error' : 'ended'
  }))
}

function summarizeEntries(
  entries: HistoryEntry[],
  clock: number
): {
  totalSessions: number
  durationMinutes: number
  totalChats: number
  totalRevenue: number
  currency: string
} {
  return entries.reduce(
    (summary, entry) => {
      summary.totalSessions += 1
      summary.durationMinutes += getDurationMinutes(
        entry.session.startedAt,
        entry.session.endedAt,
        clock
      )
      summary.totalChats += entry.chatCount
      summary.totalRevenue += entry.totalConverted
      summary.currency = entry.convertedCurrency
      return summary
    },
    { totalSessions: 0, durationMinutes: 0, totalChats: 0, totalRevenue: 0, currency: 'USD' }
  )
}

function groupEntries(entries: HistoryEntry[], clock: number): Record<GroupKey, HistoryEntry[]> {
  const grouped: Record<GroupKey, HistoryEntry[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: []
  }
  for (const entry of entries) grouped[resolveGroupKey(entry, clock)].push(entry)
  return grouped
}

function resolveGroupKey(entry: HistoryEntry, clock: number): GroupKey {
  if (entry.variant === 'live') return 'today'
  const sessionDate = new Date(entry.session.startedAt)
  const now = new Date(clock)
  if (isSameLocalDay(sessionDate, now)) return 'today'
  if (isSameLocalDay(sessionDate, addDays(now, -1))) return 'yesterday'
  if (sessionDate.getTime() >= startOfDay(addDays(now, -6)).getTime()) return 'thisWeek'
  return 'earlier'
}

function isSessionWithinRange(startedAt: string, range: DateRangeOption, clock: number): boolean {
  if (range === 'all') return true
  const now = new Date(clock)
  const start =
    range === 'last7'
      ? startOfDay(addDays(now, -6))
      : range === 'last90'
        ? startOfDay(addDays(now, -89))
        : startOfDay(addDays(now, -29))
  return new Date(startedAt).getTime() >= start.getTime()
}

function formatSessionStart(startedAt: string): string {
  return new Date(startedAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatElapsedSince(startedAt: string, clock: number): string {
  const durationMinutes = getDurationMinutes(startedAt, null, clock)
  return formatDurationFromMinutes(durationMinutes)
}

function getDurationMinutes(startedAt: string, endedAt: string | null, clock: number): number {
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : clock
  return Math.max(1, Math.round((end - start) / 60_000))
}

function formatDuration(startedAt: string, endedAt: string): string {
  return formatDurationFromMinutes(
    getDurationMinutes(startedAt, endedAt, new Date(endedAt).getTime())
  )
}

function formatDurationFromMinutes(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat().format(value)
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}
