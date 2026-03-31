import { Crown, MessageCircle, Sparkles, Bookmark, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../../lib/currency'
import type { SessionSummary } from '../../../../shared/ipc-types'
import { StreamSourceBadge } from '../dashboard/StreamSourceBadge'

interface StreamSummaryProps {
  summary: SessionSummary
}

export function StreamSummary({ summary }: StreamSummaryProps): React.JSX.Element {
  const currency = summary.convertedCurrency ?? 'USD'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Stream Summary</h2>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{summary.title ?? 'Untitled Stream'}</p>
          <StreamSourceBadge sourceMode={summary.sourceMode} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(summary.startedAt).toLocaleDateString()}{' '}
          {new Date(summary.startedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
          {summary.endedAt &&
            ` \u2014 ${new Date(summary.endedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryTile
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
          label="Total Donations"
          value={formatCurrency(summary.totalConverted, currency)}
          highlight
        />
        <SummaryTile
          icon={<MessageCircle className="w-4 h-4 text-blue-400" />}
          label="Super Chats"
          value={String(summary.messageCount - summary.stickerCount)}
        />
        <SummaryTile
          icon={<Sparkles className="w-4 h-4 text-yellow-400" />}
          label="Super Stickers"
          value={String(summary.stickerCount)}
        />
        <SummaryTile
          icon={<Bookmark className="w-4 h-4 text-yellow-400" />}
          label="Saved (Unresolved)"
          value={String(summary.savedCount)}
        />
      </div>

      {/* Average */}
      {summary.messageCount > 0 && (
        <div className="rounded-lg bg-secondary/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Average Donation</p>
          <p className="text-sm font-semibold mt-0.5">
            {formatCurrency(summary.averageDonation, currency)}
          </p>
        </div>
      )}

      {/* Top Donor */}
      {summary.highestDonor && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Top Donor</p>
              <p className="text-sm font-bold truncate">{summary.highestDonor.displayName}</p>
            </div>
            <p className="text-sm font-bold text-primary">
              {formatCurrency(summary.highestDonor.totalConverted, currency)}
            </p>
          </div>
        </div>
      )}

      {/* Top 5 Donors */}
      {summary.topDonors.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Leaderboard</h3>
          <div className="space-y-1.5">
            {summary.topDonors.slice(0, 5).map((donor, i) => (
              <div
                key={donor.channelId}
                className="flex items-center gap-3 rounded-lg bg-card p-2.5"
              >
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                  #{i + 1}
                </span>
                {donor.avatarUrl && (
                  <img src={donor.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                )}
                <span className="text-xs font-medium flex-1 truncate">{donor.displayName}</span>
                <span className="text-xs font-semibold text-primary">
                  {formatCurrency(donor.totalConverted, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryTile({
  icon,
  label,
  value,
  highlight = false
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  )
}
