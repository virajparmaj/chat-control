import { useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Crown,
  Download,
  Loader2,
  Radio,
  TriangleAlert
} from 'lucide-react'
import { formatCurrency } from '../../lib/currency'
import type { DonorAggregate, SessionReport } from '../../../../shared/ipc-types'
import { StreamSourceBadge } from './StreamSourceBadge'
import { DonorAvatar } from '../shared/DonorAvatar'

interface SessionReportViewProps {
  report: SessionReport | null
  loading: boolean
  error: string | null
  onBack: () => void
  onRetry: () => void
}

type BusyAction = 'export' | 'share' | null

type FeedbackTone = 'success' | 'error' | 'info'

interface ActionFeedback {
  tone: FeedbackTone
  message: string
}

export function SessionReportView({
  report,
  loading,
  error,
  onBack,
  onRetry
}: SessionReportViewProps): React.JSX.Element {
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null)

  if (loading) {
    return <SessionReportSkeleton onBack={onBack} />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <HeaderBackButton onBack={onBack} />
        <div className="rounded-[28px] border border-[#5b1f29] bg-[#141820] p-8 shadow-[0_24px_72px_rgba(0,0,0,0.32)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#6f1d25] bg-[#2a151a] text-[#ff7682]">
                <TriangleAlert className="h-6 w-6" />
              </div>
              <h1 className="font-display text-[1.85rem] font-semibold tracking-[-0.05em] text-[#f4f7fb]">
                Stream Summary unavailable
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#98a4b3]">{error}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[#d7dee7] transition-all duration-150 hover:border-white/12 hover:bg-white/[0.05]"
              >
                Back to History
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#e11d2e] px-4 py-2.5 text-sm font-semibold text-[#fff5f6] transition-all duration-150 hover:bg-[#ef3342]"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <HeaderBackButton onBack={onBack} />
        <div className="rounded-[28px] border border-[#263142] bg-[#121821] p-8 text-center shadow-[0_24px_72px_rgba(0,0,0,0.32)]">
          <p className="text-base font-semibold text-[#f4f7fb]">Stream Summary not found</p>
          <p className="mt-2 text-sm text-[#98a4b3]">
            This session report could not be loaded from local history.
          </p>
        </div>
      </div>
    )
  }

  const currency = report.convertedCurrency ?? 'USD'
  const superChats = Math.max(0, report.messageCount - report.stickerCount)
  const status = getStatusMeta(report)
  const totalRaisedPercentDelta = (() => {
    if (!report.comparisonToPrevious) return null
    const previousTotal = report.totalConverted - report.comparisonToPrevious.totalRaisedDelta
    if (previousTotal <= 0) return null
    return (report.comparisonToPrevious.totalRaisedDelta / previousTotal) * 100
  })()
  const supporterRows = report.topSupporters.slice(report.topDonor ? 1 : 0, 5)

  const handleExportCsv = async (): Promise<void> => {
    setBusyAction('export')
    try {
      const path = await window.api.sessions.exportCsv(report.id)
      setFeedback({
        tone: path ? 'success' : 'error',
        message: path ? `CSV exported to ${path}` : 'Unable to export this stream summary.'
      })
    } catch (actionError: unknown) {
      setFeedback({
        tone: 'error',
        message:
          actionError instanceof Error
            ? actionError.message
            : 'Failed to export this stream summary.'
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleShareSummary = async (): Promise<void> => {
    setBusyAction('share')
    try {
      const text = await window.api.sessions.copySummary(report.id)
      setFeedback({
        tone: text ? 'success' : 'error',
        message: text ? 'Summary copied to clipboard.' : 'Unable to share this stream summary.'
      })
    } catch (actionError: unknown) {
      setFeedback({
        tone: 'error',
        message:
          actionError instanceof Error
            ? actionError.message
            : 'Failed to share this stream summary.'
      })
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-5">
      <HeaderBackButton onBack={onBack} />

      <section className="rounded-[24px] border border-[#222d3c] bg-[#11161e] px-5 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-[#f4f7fb]">
                Stream Summary
              </h1>
              <span className={status.chipClass}>{status.label}</span>
            </div>
            <p className="mt-2 truncate text-sm text-[#8f9bac]">
              {report.title ?? 'Untitled Stream'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#7f8c9d]">
              <StreamSourceBadge sourceMode={report.sourceMode} />
              <span>{formatDateTimeRange(report.startedAt, report.endedAt)}</span>
              <span>Duration: {formatDurationMinutes(report.durationMinutes)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap gap-3">
              <ActionButton
                label="Export CSV"
                icon={Download}
                busy={busyAction === 'export'}
                onClick={() => void handleExportCsv()}
              />
              <ActionButton
                label="Share Summary"
                icon={Copy}
                tone="primary"
                busy={busyAction === 'share'}
                onClick={() => void handleShareSummary()}
              />
            </div>
            <p
              className={`text-xs ${feedback ? feedbackToneClass(feedback.tone) : 'text-[#7f8c9d]'}`}
            >
              {feedback?.message ??
                'Export the session ledger or hand off a clean summary to your team.'}
            </p>
          </div>
        </div>
      </section>

      {report.status === 'error' && report.lastError && (
        <div className="rounded-[20px] border border-[#6b242e] bg-[#2a161a] px-5 py-4 text-sm text-[#ffd4d8] shadow-[0_18px_42px_rgba(0,0,0,0.25)]">
          <p className="font-medium">This session ended with an error</p>
          <p className="mt-1 text-[#f4b8bf]">{report.lastError}</p>
        </div>
      )}

      {report.messageCount === 0 ? (
        <section className="rounded-[28px] border border-dashed border-[#314056] bg-[#111821] px-8 py-12 text-center shadow-[0_20px_52px_rgba(0,0,0,0.26)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#98a4b3]">
            <Radio className="h-6 w-6" />
          </div>
          <h2 className="font-display mt-5 text-[1.65rem] font-semibold tracking-[-0.04em] text-[#f4f7fb]">
            No paid events were captured for this session
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#98a4b3]">
            The monitoring session exists in history, but no Super Chats or Super Stickers were
            stored. Export and share actions remain available from the header if you still need the
            session shell.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.8fr_repeat(4,minmax(0,1fr))]">
            <MetricCard
              label="Total Raised This Stream"
              value={formatCurrency(report.totalConverted, currency)}
              accent="primary"
              footnote={
                report.comparisonToPrevious && totalRaisedPercentDelta !== null
                  ? `${formatSignedPercent(totalRaisedPercentDelta)} vs. previous stream`
                  : 'No previous completed stream'
              }
            />
            <MetricCard label="Super Chats" value={String(superChats)} footnote="messages" />
            <MetricCard
              label="Super Stickers"
              value={String(report.stickerCount)}
              footnote="stickers"
              tone="gold"
            />
            <MetricCard
              label="Average Donation"
              value={formatCurrency(report.averageDonation, currency)}
              footnote="per paid event"
            />
            <MetricCard
              label="Saved for Later"
              value={String(report.savedCount)}
              footnote="unresolved"
              tone="blue"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.12fr_1.62fr]">
            <TopDonorCard donor={report.topDonor} currency={currency} />
            <InsightsCard report={report} currency={currency} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_1.52fr]">
            <TopSupportersCard
              supporters={supporterRows}
              topDonor={report.topDonor}
              currency={currency}
            />
            <DonationBreakdownCard report={report} currency={currency} />
          </section>
        </>
      )}
    </div>
  )
}

function HeaderBackButton({ onBack }: { onBack: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#cad3de] transition-all duration-150 hover:border-white/12 hover:bg-white/[0.05] hover:text-[#f4f7fb]"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Session History
    </button>
  )
}

function ActionButton({
  label,
  icon: Icon,
  tone = 'default',
  busy = false,
  onClick
}: {
  label: string
  icon: typeof Download
  tone?: 'default' | 'primary'
  busy?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === 'primary'
          ? 'bg-[#e11d2e] text-[#fff4f5] hover:bg-[#ef3342]'
          : 'border border-white/8 bg-white/[0.03] text-[#d7dee7] hover:border-white/12 hover:bg-white/[0.05]'
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  )
}

function MetricCard({
  label,
  value,
  footnote,
  accent = 'default',
  tone = 'default'
}: {
  label: string
  value: string
  footnote: string
  accent?: 'default' | 'primary'
  tone?: 'default' | 'gold' | 'blue'
}): React.JSX.Element {
  const shellClass =
    accent === 'primary'
      ? 'border-[#5a1c25] bg-[linear-gradient(180deg,rgba(66,18,26,0.88),rgba(34,15,21,0.9))] shadow-[0_20px_48px_rgba(90,18,32,0.18)]'
      : 'border-[#263142] bg-[#121821] shadow-[0_18px_42px_rgba(0,0,0,0.22)]'
  const valueClass =
    tone === 'gold'
      ? 'text-[#f7c948]'
      : tone === 'blue'
        ? 'text-[#57a3ff]'
        : accent === 'primary'
          ? 'text-[#f7f8fb]'
          : 'text-[#f4f7fb]'
  const footnoteClass =
    accent === 'primary' && footnote.startsWith('+') ? 'text-[#1cd38a]' : 'text-[#8f9bac]'

  return (
    <div className={`rounded-[22px] border px-5 py-6 ${shellClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7f8c9d]">{label}</p>
      <p
        className={`mt-5 font-display text-[clamp(1.9rem,2vw,3rem)] font-semibold tracking-[-0.05em] ${valueClass}`}
      >
        {value}
      </p>
      <p className={`mt-3 text-sm font-medium ${footnoteClass}`}>{footnote}</p>
    </div>
  )
}

function TopDonorCard({
  donor,
  currency
}: {
  donor: DonorAggregate | null
  currency: string
}): React.JSX.Element {
  return (
    <section className="rounded-[28px] border border-[#5a4b1e] bg-[linear-gradient(135deg,rgba(67,49,15,0.75),rgba(47,23,28,0.92))] p-6 shadow-[0_22px_52px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f3c44e]">
        <Crown className="h-4 w-4" />
        Top Donor This Stream
      </div>

      {donor ? (
        <div className="mt-6 flex items-center gap-5">
          <DonorAvatar
            donor={donor}
            size="xl"
            ringClassName="ring-2 ring-[#f3c44e]/40"
            fallbackClassName="border border-[#f4c742] bg-[radial-gradient(circle_at_30%_30%,#ff2e43,#f61d3e_55%,#d30f28)]"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-[2rem] font-semibold tracking-[-0.05em] text-[#f4f7fb]">
              {donor.displayName}
            </p>
            <p className="mt-2 text-[2.15rem] font-semibold tracking-[-0.05em] text-[#21d19a]">
              {formatCurrency(donor.totalConverted, currency)}
            </p>
            <p className="mt-1 text-sm text-[#c0c8d5]">
              {donor.messageCount} donation{donor.messageCount === 1 ? '' : 's'} throughout the
              stream
            </p>
          </div>
        </div>
      ) : (
        <EmptyPanelCopy message="Top donor will appear once this session receives a paid event." />
      )}
    </section>
  )
}

function InsightsCard({
  report,
  currency
}: {
  report: SessionReport
  currency: string
}): React.JSX.Element {
  const comparisonItems = report.comparisonToPrevious
    ? [
        {
          label: 'Total Raised',
          value: formatSignedCurrency(report.comparisonToPrevious.totalRaisedDelta, currency)
        },
        {
          label: 'Super Chats',
          value: formatSignedNumber(report.comparisonToPrevious.superChatsDelta)
        },
        {
          label: 'Unique Donors',
          value: formatSignedNumber(report.comparisonToPrevious.uniqueDonorsDelta)
        },
        {
          label: 'Avg. Amount',
          value: formatSignedCurrency(report.comparisonToPrevious.averageDonationDelta, currency)
        }
      ]
    : []

  return (
    <section className="rounded-[28px] border border-[#263142] bg-[#121821] p-5 shadow-[0_22px_52px_rgba(0,0,0,0.24)]">
      <div className="flex items-center gap-3">
        <span className="h-8 w-1 rounded-full bg-[#4ea0ff]" />
        <h2 className="font-display text-[1.45rem] font-semibold tracking-[-0.04em] text-[#f4f7fb]">
          Stream Insights
        </h2>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.95fr]">
        <div className="space-y-3">
          <InsightStat
            label="Peak Donations"
            title={
              report.peakDonationWindow
                ? formatTimeRange(
                    report.peakDonationWindow.startAt,
                    report.peakDonationWindow.endAt
                  )
                : 'No paid activity'
            }
            value={
              report.peakDonationWindow
                ? formatCurrency(report.peakDonationWindow.totalConverted, currency)
                : '—'
            }
            valueTone="emerald"
          />
          <InsightStat
            label="Highest Single Donation"
            title={report.highestSingleDonation?.donorDisplayName ?? 'No supporter data'}
            value={
              report.highestSingleDonation
                ? formatCurrency(
                    report.highestSingleDonation.amount,
                    report.highestSingleDonation.currency
                  )
                : '—'
            }
            valueTone="red"
          />
          <InsightStat
            label="First-Time Donors"
            title="New supporters"
            value={String(report.newSupporters)}
          />
        </div>

        <div className="rounded-[20px] bg-[#171f2a] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7f8c9d]">
            Compared to Previous Stream
          </p>
          {comparisonItems.length > 0 ? (
            <div className="mt-4 space-y-3">
              {comparisonItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#c7d0dc]">{item.label}</span>
                  <span
                    className={
                      item.value.startsWith('-')
                        ? 'font-semibold text-[#ff7682]'
                        : 'font-semibold text-[#21d19a]'
                    }
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#98a4b3]">
              No earlier completed session exists in local history yet, so comparison metrics will
              appear after your next finished stream.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function DonationBreakdownCard({
  report,
  currency
}: {
  report: SessionReport
  currency: string
}): React.JSX.Element {
  return (
    <section className="rounded-[28px] border border-[#263142] bg-[#121821] p-5 shadow-[0_22px_52px_rgba(0,0,0,0.24)]">
      <div className="flex items-center gap-3">
        <span className="h-8 w-1 rounded-full bg-[#e11d2e]" />
        <h2 className="font-display text-[1.45rem] font-semibold tracking-[-0.04em] text-[#f4f7fb]">
          Donation Breakdown
        </h2>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <BreakdownPanel title="By Amount">
          <BreakdownRow label="$100+" value={String(report.amountBuckets.hundredPlus)} tone="red" />
          <BreakdownRow label="$50 - $99" value={String(report.amountBuckets.fiftyToNinetyNine)} />
          <BreakdownRow label="$20 - $49" value={String(report.amountBuckets.twentyToFortyNine)} />
          <BreakdownRow label="Under $20" value={String(report.amountBuckets.underTwenty)} />
        </BreakdownPanel>

        <BreakdownPanel title="By Type">
          <BreakdownRow
            label="Super Chats"
            meta={formatCurrency(report.typeBreakdown.superChats.totalConverted, currency)}
            value={String(report.typeBreakdown.superChats.count)}
            tone="green"
          />
          <BreakdownRow
            label="Super Stickers"
            meta={formatCurrency(report.typeBreakdown.superStickers.totalConverted, currency)}
            value={String(report.typeBreakdown.superStickers.count)}
            tone="gold"
          />
        </BreakdownPanel>

        <BreakdownPanel title="Quick Stats">
          <BreakdownRow label="Unique Donors" value={String(report.uniqueDonors)} />
          <BreakdownRow label="Repeat Donors" value={String(report.repeatDonors)} />
          <BreakdownRow label="Messages/Hour" value={report.messagesPerHour.toFixed(1)} />
        </BreakdownPanel>
      </div>
    </section>
  )
}

function TopSupportersCard({
  supporters,
  topDonor,
  currency
}: {
  supporters: DonorAggregate[]
  topDonor: DonorAggregate | null
  currency: string
}): React.JSX.Element {
  return (
    <section className="rounded-[26px] border border-[#263142] bg-[#121821] p-5 shadow-[0_22px_52px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[1.4rem] font-semibold tracking-[-0.04em] text-[#f4f7fb]">
          Top Supporters
        </h2>
        <span className="text-sm font-medium text-[#57a3ff]">View Full List</span>
      </div>

      <div className="mt-4 space-y-2.5">
        {supporters.length > 0 ? (
          supporters.map((supporter, index) => {
            const rank = (topDonor ? 2 : 1) + index
            return (
              <div
                key={supporter.channelId}
                className="flex items-center gap-3 rounded-[18px] border border-transparent bg-[#171f2a] px-4 py-3 transition-all duration-150 hover:border-[#314056] hover:bg-[#1a2330]"
              >
                <span className="w-7 text-center text-[1.35rem] font-semibold tracking-[-0.04em] text-[#7d8897]">
                  {rank}
                </span>
                <DonorAvatar donor={supporter} size="lg" ringClassName="ring-2 ring-[#314056]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#f4f7fb]">
                    {supporter.displayName}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#d8e0eb]">
                  {formatCurrency(supporter.totalConverted, currency)}
                </span>
                <ChevronRight className="h-4 w-4 text-[#617084]" />
              </div>
            )
          })
        ) : (
          <EmptyPanelCopy message="Supporter rankings will populate as soon as donations land in this session." />
        )}
      </div>
    </section>
  )
}

function InsightStat({
  label,
  title,
  value,
  valueTone = 'default'
}: {
  label: string
  title: string
  value: string
  valueTone?: 'default' | 'emerald' | 'red'
}): React.JSX.Element {
  const valueClass =
    valueTone === 'emerald'
      ? 'text-[#21d19a]'
      : valueTone === 'red'
        ? 'text-[#ff5a68]'
        : 'text-[#f4f7fb]'

  return (
    <div className="rounded-[18px] bg-[#171f2a] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f8c9d]">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#d9e1eb]">{title}</p>
        <span className={`text-[1.55rem] font-semibold tracking-[-0.04em] ${valueClass}`}>
          {value}
        </span>
      </div>
    </div>
  )
}

function BreakdownPanel({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-[18px] bg-[#171f2a] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f8c9d]">
        {title}
      </p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  meta,
  tone = 'default'
}: {
  label: string
  value: string
  meta?: string
  tone?: 'default' | 'green' | 'gold' | 'red'
}): React.JSX.Element {
  const valueClass =
    tone === 'green'
      ? 'text-[#21d19a]'
      : tone === 'gold'
        ? 'text-[#f7c948]'
        : tone === 'red'
          ? 'text-[#ff5a68]'
          : 'text-[#f4f7fb]'

  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-sm text-[#c7d0dc]">{label}</p>
        {meta && <p className={`mt-0.5 text-sm font-semibold ${valueClass}`}>{meta}</p>}
      </div>
      <span className={`text-[1.45rem] font-semibold tracking-[-0.04em] ${valueClass}`}>
        {value}
      </span>
    </div>
  )
}

function EmptyPanelCopy({ message }: { message: string }): React.JSX.Element {
  return <p className="mt-5 text-sm leading-6 text-[#98a4b3]">{message}</p>
}

function SessionReportSkeleton({ onBack }: { onBack: () => void }): React.JSX.Element {
  return (
    <div className="space-y-5 animate-pulse">
      <HeaderBackButton onBack={onBack} />
      <div className="rounded-[24px] border border-[#222d3c] bg-[#11161e] p-5">
        <div className="h-10 w-48 rounded-full bg-white/6" />
        <div className="mt-4 h-5 w-72 rounded-full bg-white/6" />
        <div className="mt-3 h-4 w-96 rounded-full bg-white/6" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.8fr_repeat(4,minmax(0,1fr))]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-40 rounded-[22px] border border-[#263142] bg-[#121821]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.12fr_1.62fr]">
        <div className="h-64 rounded-[28px] border border-[#263142] bg-[#121821]" />
        <div className="h-64 rounded-[28px] border border-[#263142] bg-[#121821]" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_1.52fr]">
        <div className="h-72 rounded-[28px] border border-[#263142] bg-[#121821]" />
        <div className="h-72 rounded-[28px] border border-[#263142] bg-[#121821]" />
      </div>
    </div>
  )
}

function getStatusMeta(report: SessionReport): { label: string; chipClass: string } {
  if (report.status === 'active') {
    return {
      label: 'LIVE',
      chipClass:
        'inline-flex items-center gap-2 rounded-full border border-[#6f1d25] bg-[#341318] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff8b96] before:h-2 before:w-2 before:rounded-full before:bg-[#e11d2e] before:animate-pulse'
    }
  }

  if (report.status === 'error') {
    return {
      label: 'NEEDS ATTENTION',
      chipClass:
        'inline-flex items-center rounded-full border border-[#6b242e] bg-[#2b151a] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff8b96]'
    }
  }

  return {
    label: 'COMPLETED',
    chipClass:
      'inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300'
  }
}

function formatDurationMinutes(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function formatDateTimeRange(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt)
  const end = endedAt ? new Date(endedAt) : null
  const startDate = start.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const startTime = start.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })

  if (!end) {
    return `${startDate} / ${startTime} - Live now`
  }

  const endTime = end.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })

  return `${startDate} / ${startTime} - ${endTime}`
}

function formatTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })
  const end = new Date(endAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })
  return `${start} - ${end}`
}

function formatSignedNumber(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`
}

function formatSignedCurrency(value: number, currency: string): string {
  const absolute = formatCurrency(Math.abs(value), currency)
  return `${value >= 0 ? '+' : '-'}${absolute}`
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function feedbackToneClass(tone: FeedbackTone): string {
  if (tone === 'success') return 'text-[#21d19a]'
  if (tone === 'error') return 'text-[#ff8b96]'
  return 'text-[#8fb9ff]'
}
