import { Crown, Trophy } from 'lucide-react'
import { useSuperchatStore } from '../../store/superchats'
import { useStreamStore } from '../../store/stream'
import { useSettingsStore } from '../../store/settings'
import { formatCurrency } from '../../lib/currency'

export function DonorLeaderboard(): React.JSX.Element {
  const donors = useSuperchatStore((state) => state.donors)
  const stats = useSuperchatStore((state) => state.stats)
  const activeSession = useStreamStore((state) => state.activeSession)
  const preferences = useSettingsStore((state) => state.preferences)

  const displayCurrency =
    activeSession?.convertedCurrency ?? stats.convertedCurrency ?? preferences.preferredCurrency

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Donor Leaderboard</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Top supporters ranked by total donations for the current session.
      </p>

      {donors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No donations yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Start or restore a monitoring session to see live donor rankings.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {donors.map((donor, index) => (
            <div
              key={donor.channelId}
              className={`flex items-center gap-4 rounded-xl border bg-card p-4 ${
                index === 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border'
              }`}
            >
              <div className="w-8 shrink-0 text-center">
                {index === 0 ? (
                  <Crown className="mx-auto h-5 w-5 text-yellow-400" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                )}
              </div>

              {donor.avatarUrl && (
                <img src={donor.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{donor.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {donor.messageCount} {donor.messageCount === 1 ? 'donation' : 'donations'}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-primary">
                  {formatCurrency(donor.totalConverted, displayCurrency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
