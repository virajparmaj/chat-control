import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Crown,
  Loader2,
  MessageSquareMore,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useSettingsStore } from '../../store/settings'
import { useStreamStore } from '../../store/stream'
import { useSuperchatStore } from '../../store/superchats'
import { formatCurrency } from '../../lib/currency'
import { getTierAccentColor } from '../../lib/tiers'
import { StreamSourceBadge } from './StreamSourceBadge'
import { DonorAvatar } from '../shared/DonorAvatar'
import type { PaidMessage, SortOrder, StreamStatusEvent } from '../../../../shared/ipc-types'

interface LiveSessionCommandProps {
  onStop: () => Promise<void>
  loading: boolean
  error: string | null
}

type FeedbackTone = 'success' | 'error' | 'info'

interface ActionFeedback {
  tone: FeedbackTone
  message: string
}

const commandFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3f6fa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d12] focus-visible:shadow-[0_0_0_3px_rgba(225,29,46,0.28)]'

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest', label: 'Highest' }
]

export function LiveSessionCommand({
  onStop,
  loading,
  error
}: LiveSessionCommandProps): React.JSX.Element {
  const authStatus = useAuthStore((state) => state.status)
  const activeSession = useStreamStore((state) => state.activeSession)
  const streamStatus = useStreamStore((state) => state.streamStatus)
  const messages = useSuperchatStore((state) => state.messages)
  const donors = useSuperchatStore((state) => state.donors)
  const stats = useSuperchatStore((state) => state.stats)
  const sort = useSuperchatStore((state) => state.sort)
  const markRead = useSuperchatStore((state) => state.markRead)
  const save = useSuperchatStore((state) => state.save)
  const markAllRead = useSuperchatStore((state) => state.markAllRead)
  const setSort = useSuperchatStore((state) => state.setSort)
  const preferences = useSettingsStore((state) => state.preferences)

  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null)
  const [clock, setClock] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  if (!activeSession) {
    return <></>
  }

  const displayCurrency =
    activeSession.convertedCurrency ?? stats.convertedCurrency ?? preferences.preferredCurrency
  const superChatsCount = Math.max(0, stats.messageCount - stats.stickerCount)
  const statusMeta = getStatusMeta(streamStatus, error)
  const topDonor = donors[0] ?? null
  const channelLabel = authStatus.displayName ?? 'My Channel'

  const priorityThreshold = (() => {
    const highestValue = Math.max(...messages.map((message) => getMessageAmount(message)), 0)
    const baseline = Math.max(stats.averageDonation * 1.45, 20)
    return Math.min(Math.max(baseline, 10), highestValue || baseline)
  })()

  const sortedDonors = donors.slice(0, 5)

  const handleOpenOverlay = async (): Promise<void> => {
    setBusyAction('overlay')
    try {
      await window.api.window.toggleOverlay()
      setFeedback({ tone: 'info', message: 'Overlay toggled for this live session.' })
    } finally {
      setBusyAction(null)
    }
  }

  const handleMarkAllRead = async (): Promise<void> => {
    setBusyAction('mark-all')
    try {
      const count = await markAllRead()
      setFeedback({
        tone: count > 0 ? 'success' : 'info',
        message: count > 0 ? `${count} unread message${count === 1 ? '' : 's'} cleared.` : 'Inbox is already fully triaged.'
      })
    } catch (actionError: unknown) {
      setFeedback({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'Failed to clear unread messages.'
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleExportCsv = async (): Promise<void> => {
    setBusyAction('export')
    try {
      const path = await window.api.sessions.exportCsv(activeSession.id)
      setFeedback({
        tone: path ? 'success' : 'error',
        message: path ? `CSV exported to ${path}` : 'Unable to export this session.'
      })
    } catch (actionError: unknown) {
      setFeedback({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'Failed to export session CSV.'
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleCopySummary = async (): Promise<void> => {
    setBusyAction('summary')
    try {
      const text = await window.api.sessions.copySummary(activeSession.id)
      setFeedback({
        tone: text ? 'success' : 'error',
        message: text ? 'Session summary copied to clipboard.' : 'Unable to copy session summary.'
      })
    } catch (actionError: unknown) {
      setFeedback({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'Failed to copy summary.'
      })
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[18px] border border-[#2a3342] bg-[#161d26] px-5 py-3 shadow-[0_18px_44px_rgba(4,7,12,0.28)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="sr-only">Live Session</p>
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#35171c] px-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Live
                </span>
                {statusMeta.showChip && (
                  <span
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] border px-3 text-[11px] font-medium ${statusMeta.chipClass}`}
                  >
                    {statusMeta.icon}
                    {statusMeta.label}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="truncate font-display text-[1.35rem] font-semibold tracking-[-0.04em] text-foreground">
                  {activeSession.title ?? 'Untitled Live Session'}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
                  <span>{channelLabel}</span>
                  <span>{formatElapsed(activeSession.startedAt, clock)}</span>
                  <span>{stats.messageCount} tracked</span>
                  {activeSession.sourceMode === 'public_video' && (
                    <StreamSourceBadge sourceMode={activeSession.sourceMode} compact />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 self-start xl:self-center">
            <button
              onClick={() => void handleOpenOverlay()}
              disabled={loading || busyAction === 'overlay'}
              className={`inline-flex h-10 items-center justify-center rounded-[10px] border border-[#303b4b] bg-transparent px-5 text-[13px] font-medium text-[#d7dee7] transition-colors hover:border-[#3a4658] hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-60 ${commandFocusRing}`}
            >
              {busyAction === 'overlay' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open Overlay'}
            </button>
            <button
              onClick={() => void onStop()}
              disabled={loading}
              className={`inline-flex h-10 items-center justify-center rounded-[10px] border border-[#7a222b] bg-transparent px-5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/8 disabled:cursor-not-allowed disabled:opacity-60 ${commandFocusRing}`}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Stop Monitoring'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-6 xl:grid-cols-12">
        <KpiCard
          label="Total Raised"
          value={formatCurrency(stats.totalConverted, displayCurrency)}
          accent="primary"
          spanClass="md:col-span-3 xl:col-span-4"
          footnote={`${stats.messageCount} paid events`}
        />
        <KpiCard
          label="Super Chats"
          value={`${superChatsCount}`}
          accent="neutral"
          spanClass="md:col-span-2 xl:col-span-2"
          footnote="messages"
        />
        <KpiCard
          label="Super Stickers"
          value={`${stats.stickerCount}`}
          accent="neutral"
          spanClass="md:col-span-2 xl:col-span-2"
          footnote="stickers"
        />
        <KpiCard
          label="Unread"
          value={`${stats.unreadCount}`}
          accent="warning"
          spanClass="md:col-span-3 xl:col-span-2"
          footnote={stats.unreadCount === 1 ? 'needs attention' : 'need attention'}
        />
        <KpiCard
          label="Saved"
          value={`${stats.savedCount}`}
          accent="saved"
          spanClass="md:col-span-3 xl:col-span-2"
          footnote="held for later"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_22rem]">
        <div className="overflow-hidden rounded-[28px] border border-border/80 bg-[#0f141c] shadow-[0_24px_64px_rgba(4,7,12,0.35)]">
          <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-[1rem] font-semibold tracking-[-0.03em] text-foreground">
                Inbox
              </h2>
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-[12px] font-semibold text-[#fff4f5]">
                {stats.unreadCount}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-1 rounded-[10px] bg-[#171d25] p-1">
                {SORT_OPTIONS.map((option) => {
                  const selected = option.value === sort
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSort(option.value)}
                      className={`inline-flex h-8 items-center rounded-[8px] px-3 text-[12px] font-semibold transition-colors ${
                        selected
                          ? 'bg-[#5a1b24] text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {(statusMeta.banner || error) && (
            <div className="border-b border-border/80 px-5 py-3">
              <div className={`flex items-start gap-3 rounded-[12px] border px-4 py-3 text-sm ${statusMeta.bannerClass}`}>
                <div className="mt-0.5">{statusMeta.bannerIcon}</div>
                <div>
                  <p className="font-medium text-foreground">{error ?? statusMeta.bannerTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{statusMeta.bannerCopy}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 px-3 py-3">
            {loading && messages.length === 0 ? (
              Array.from({ length: 3 }).map((_, index) => <MessageSkeleton key={index} />)
            ) : messages.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-[#111720] px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-[#171f2b]">
                  <MessageSquareMore className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Inbox standing by</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Paid messages will surface here the moment they land. High-value and unread items rise to the top of the attention queue.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <LiveMessageCard
                  key={message.id}
                  message={message}
                  priorityThreshold={priorityThreshold}
                  onMarkRead={markRead}
                  onSave={save}
                  displayCurrency={displayCurrency}
                />
              ))
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-[20px] border border-border/80 bg-card p-4 shadow-[0_20px_48px_rgba(4,7,12,0.22)]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f3bd69]">
              <Crown className="h-3.5 w-3.5" />
              Top Donor This Stream
            </div>

            {topDonor ? (
              <div className="mt-4 flex items-center gap-4">
                <DonorAvatar donor={topDonor} ringClassName="ring-1 ring-[#f3bd69]/35" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[1.05rem] font-semibold tracking-[-0.03em] text-foreground">
                    {topDonor.displayName}
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-[1.9rem] font-semibold tracking-[-0.04em] text-emerald-300">
                      {formatCurrency(topDonor.totalConverted, displayCurrency)}
                    </span>
                    <span className="pb-0.5 text-[12px] text-muted-foreground">
                      {topDonor.messageCount} donation{topDonor.messageCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <EmptySideCard message="Top donor will appear once the first paid message lands." />
            )}
          </div>

          <div className="rounded-[20px] border border-border/80 bg-card p-4 shadow-[0_20px_48px_rgba(4,7,12,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-[1rem] font-semibold tracking-[-0.03em] text-foreground">
                  Leaderboard
                </h3>
              </div>
              <span className="text-[12px] font-medium text-muted-foreground">View All</span>
            </div>

            <div className="mt-4 space-y-2">
              {sortedDonors.length === 0 ? (
                <EmptySideCard message="Donor rankings update as contributions come in." compact />
              ) : (
                sortedDonors.map((donor, index) => (
                  <div
                    key={donor.channelId}
                    className={`flex items-center gap-3 rounded-[12px] border px-3 py-2.5 ${
                      index === 0 ? 'border-primary/20 bg-primary/6' : 'border-border/80 bg-[#161c25]'
                    }`}
                  >
                    <span className="w-5 shrink-0 text-center text-[12px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <DonorAvatar
                      donor={donor}
                      size="sm"
                      ringClassName={index === 0 ? 'ring-1 ring-primary/30' : 'ring-1 ring-border'}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{donor.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {donor.messageCount} donation{donor.messageCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="text-[13px] font-semibold text-foreground">
                      {formatCurrency(donor.totalConverted, displayCurrency)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[20px] border border-border/80 bg-card p-4 shadow-[0_20px_48px_rgba(4,7,12,0.22)]">
            <div>
              <h3 className="font-display text-[1rem] font-semibold tracking-[-0.03em] text-foreground">
                Quick Actions
              </h3>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <QuickActionButton
                label="Mark All Read"
                onClick={handleMarkAllRead}
                disabled={stats.unreadCount === 0 || busyAction === 'mark-all'}
                busy={busyAction === 'mark-all'}
              />
              <QuickActionButton
                label="Export CSV"
                onClick={handleExportCsv}
                disabled={busyAction === 'export'}
                busy={busyAction === 'export'}
              />
              <QuickActionButton
                label="Copy Summary"
                onClick={handleCopySummary}
                disabled={busyAction === 'summary'}
                busy={busyAction === 'summary'}
              />
            </div>

            <div className="mt-4 rounded-[12px] border border-border/80 bg-[#161c25] px-3 py-3 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                {preferences.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-emerald-300" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">
                  Sound alerts {preferences.soundEnabled ? 'enabled' : 'muted'}
                </span>
              </div>
              <p className={`mt-2 text-xs ${feedback ? feedbackClass(feedback.tone) : 'text-muted-foreground'}`}>
                {feedback?.message ?? 'Use these controls to clear queue pressure or hand off a clean summary.'}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

function KpiCard({
  label,
  value,
  footnote,
  accent,
  spanClass
}: {
  label: string
  value: string
  footnote: string
  accent: 'primary' | 'warning' | 'saved' | 'neutral'
  spanClass: string
}): React.JSX.Element {
  const accentMap = {
    primary: 'border-primary/24 bg-[linear-gradient(180deg,rgba(225,29,46,0.08),rgba(19,24,33,0.98))] text-foreground',
    warning: 'border-border/80 bg-card text-primary',
    saved: 'border-border/80 bg-card text-[#59a7ff]',
    neutral: 'border-border/80 bg-card text-foreground'
  } as const

  return (
    <div className={`rounded-[16px] border p-5 shadow-[0_18px_40px_rgba(4,7,12,0.14)] ${accentMap[accent]} ${spanClass}`}>
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-display text-[clamp(1.65rem,1.5vw,2.3rem)] font-semibold tracking-[-0.05em] text-current">
          {value}
        </p>
        <p className="pb-1 text-[12px] text-muted-foreground">{footnote}</p>
      </div>
    </div>
  )
}

function LiveMessageCard({
  message,
  priorityThreshold,
  onMarkRead,
  onSave,
  displayCurrency
}: {
  message: PaidMessage
  priorityThreshold: number
  onMarkRead: (messageId: string) => Promise<void>
  onSave: (messageId: string) => Promise<void>
  displayCurrency: string
}): React.JSX.Element {
  const amount = getMessageAmount(message)
  const displayAmount =
    message.convertedAmount !== null && message.convertedCurrency
      ? formatCurrency(message.convertedAmount, message.convertedCurrency)
      : formatCurrency(message.originalAmount, message.originalCurrency)

  const fallbackConverted =
    message.convertedCurrency && message.convertedCurrency !== message.originalCurrency
      ? formatCurrency(amount, displayCurrency)
      : null

  const isPriority = message.state === 'unread' && amount >= priorityThreshold
  const isUnread = message.state === 'unread'
  const isRead = message.state === 'read'
  const isSaved = message.state === 'saved'
  const accentColor = getTierAccentColor(message.tier)

  const shellClass = isPriority
    ? 'border-primary/24 bg-[linear-gradient(180deg,rgba(225,29,46,0.08),rgba(22,26,34,0.98))]'
    : isUnread
      ? 'border-border bg-[#151b24]'
      : isSaved
        ? 'border-amber-500/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.06),rgba(18,24,33,0.96))]'
        : 'border-border/70 bg-[#121820] opacity-80'

  return (
    <article className={`group relative overflow-hidden rounded-[16px] border px-4 py-3.5 transition-colors hover:border-[#334055] ${shellClass}`}>
      <div className="absolute bottom-3 left-0 top-3 w-px rounded-r-full" style={{ backgroundColor: isPriority ? '#e11d2e' : accentColor }} />
      <div className="ml-1.5 flex gap-3">
          <DonorAvatar
            donor={{ displayName: message.donorDisplayName, avatarUrl: message.donorAvatarUrl }}
            ringClassName={isPriority ? 'ring-1 ring-primary/35' : 'ring-1 ring-border'}
          />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-foreground">{message.donorDisplayName}</p>
            {message.type === 'super_sticker' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                <Sparkles className="h-3 w-3" />
                Sticker
              </span>
            )}
            {isPriority && (
              <span className="inline-flex items-center rounded-[6px] bg-primary/18 px-2 py-0.5 text-[11px] font-semibold text-primary">
                High Value
              </span>
            )}
            {isSaved && (
              <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                Saved
              </span>
            )}
            {isRead && (
              <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                Read
              </span>
            )}
            <span
              className={`rounded-[6px] px-2 py-0.5 text-[14px] font-semibold leading-none ${
                isPriority ? 'bg-primary/16 text-primary' : 'bg-[#1b2430] text-[#59a7ff]'
              }`}
            >
              {displayAmount}
            </span>
            {fallbackConverted && fallbackConverted !== displayAmount && (
              <span className="text-[12px] text-muted-foreground">{fallbackConverted}</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(message.receivedAt)}</span>
          </div>

          <p className="mt-2 text-[14px] leading-5 text-foreground/84">
            {message.messageText ?? message.stickerAltText ?? 'Support sent with no message.'}
          </p>

          {(isUnread || isSaved) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <MessageActionButton
                label={isRead ? 'Read' : 'Mark Read'}
                onClick={() => void onMarkRead(message.id)}
                disabled={isRead}
                tone={isRead ? 'muted' : 'default'}
              />
              <MessageActionButton
                label={isSaved ? 'Saved' : 'Save'}
                onClick={() => void onSave(message.id)}
                disabled={isSaved}
                tone={isSaved ? 'saved' : 'default'}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function QuickActionButton({
  label,
  onClick,
  disabled,
  busy
}: {
  label: string
  onClick: () => void
  disabled: boolean
  busy: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center rounded-[10px] border border-border/80 bg-[#161c25] px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-[#1b2430] disabled:cursor-not-allowed disabled:opacity-50 ${commandFocusRing}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{label}</span>}
    </button>
  )
}

function MessageActionButton({
  label,
  onClick,
  disabled,
  tone
}: {
  label: string
  onClick: () => void
  disabled: boolean
  tone: 'default' | 'saved' | 'muted'
}): React.JSX.Element {
  const toneClass =
    tone === 'saved'
      ? 'border-amber-400/18 bg-amber-400/8 text-amber-200'
      : tone === 'muted'
        ? 'border-border/70 bg-[#171d26] text-muted-foreground'
        : 'border-[#2d394b] bg-[#1b2430] text-[#b8c0cb] hover:border-[#394659] hover:text-[#f3f6fa]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 items-center justify-center rounded-[7px] border px-3 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${commandFocusRing} ${toneClass}`}
    >
      {label}
    </button>
  )
}

function EmptySideCard({
  message,
  compact = false
}: {
  message: string
  compact?: boolean
}): React.JSX.Element {
  return (
    <div className={`rounded-2xl border border-dashed border-border/80 bg-[#151b24] text-muted-foreground ${compact ? 'px-4 py-5 text-sm' : 'mt-4 px-4 py-6 text-sm'}`}>
      {message}
    </div>
  )
}

function MessageSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-[24px] border border-border/80 bg-[#151b24] p-4">
      <div className="flex gap-4">
        <div className="h-14 w-14 animate-pulse rounded-full bg-[#1c2430]" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-40 animate-pulse rounded-full bg-[#1c2430]" />
            <div className="ml-auto h-3 w-16 animate-pulse rounded-full bg-[#1c2430]" />
          </div>
          <div className="h-8 w-32 animate-pulse rounded-full bg-[#1c2430]" />
          <div className="h-3 w-full animate-pulse rounded-full bg-[#1c2430]" />
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-[#1c2430]" />
          <div className="flex gap-2">
            <div className="h-8 w-24 animate-pulse rounded-full bg-[#1c2430]" />
            <div className="h-8 w-20 animate-pulse rounded-full bg-[#1c2430]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function getMessageAmount(message: PaidMessage): number {
  return message.convertedAmount ?? message.originalAmount
}

function formatElapsed(startedAt: string, clock: number): string {
  const diff = Math.max(0, clock - new Date(startedAt).getTime())
  const totalMinutes = Math.floor(diff / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m live`
  return `${hours}h ${minutes}m live`
}

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const seconds = Math.max(0, Math.floor(diff / 1000))

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function feedbackClass(tone: FeedbackTone): string {
  switch (tone) {
    case 'success':
      return 'text-emerald-300'
    case 'error':
      return 'text-primary'
    default:
      return 'text-muted-foreground'
  }
}

function getStatusMeta(status: StreamStatusEvent | null, error: string | null): {
  label: string
  icon: React.JSX.Element
  chipClass: string
  showChip: boolean
  banner: boolean
  bannerIcon: React.JSX.Element
  bannerTitle: string
  bannerCopy: string
  bannerClass: string
} {
  if (error || status?.type === 'error') {
    const statusMessage = status?.type === 'error' ? status.message : null
    return {
      label: 'Disconnected',
      icon: <WifiOff className="h-3.5 w-3.5" />,
      chipClass: 'border-primary/25 bg-primary/10 text-primary',
      showChip: true,
      banner: true,
      bannerIcon: <AlertCircle className="h-4 w-4 text-primary" />,
      bannerTitle: error ?? statusMessage ?? 'Monitoring connection dropped.',
      bannerCopy: 'The session is paused. Reconnect monitoring or resume after YouTube access recovers.',
      bannerClass: 'border-primary/20 bg-primary/10'
    }
  }

  if (status?.type === 'reconnecting') {
    return {
      label: `Reconnecting`,
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      chipClass: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
      showChip: true,
      banner: true,
      bannerIcon: <Loader2 className="h-4 w-4 animate-spin text-amber-200" />,
      bannerTitle: `Reconnecting to YouTube chat (attempt ${status.attempt})`,
      bannerCopy: 'Monitoring is still in progress. New messages will repopulate as soon as the connection stabilizes.',
      bannerClass: 'border-amber-400/20 bg-amber-400/10'
    }
  }

  return {
    label: 'Monitoring Stable',
    icon: <Wifi className="h-3.5 w-3.5" />,
    chipClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    showChip: false,
    banner: false,
    bannerIcon: <Radio className="h-4 w-4" />,
    bannerTitle: '',
    bannerCopy: '',
    bannerClass: 'border-border bg-card'
  }
}
