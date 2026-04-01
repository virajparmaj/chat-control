import { formatCurrency } from '../../lib/currency'
import { formatLeaderboardRecency, formatMemberSince } from '../../lib/time'
import { DonorAvatar } from '../shared/DonorAvatar'
import type { RankedLeaderboardDonor } from '../../../../shared/leaderboard'

export function LeaderboardTable({
  rows,
  currency
}: {
  rows: RankedLeaderboardDonor[]
  currency: string
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#202834] bg-[#121821] shadow-[0_28px_72px_rgba(0,0,0,0.32)]">
      <div className="grid grid-cols-[90px_minmax(0,1.65fr)_180px_190px_150px] border-b border-white/6 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f7b8d]">
        <span>Rank</span>
        <span>Donor</span>
        <span>Donations</span>
        <span>Last Donation</span>
        <span className="text-right">Total</span>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-8 text-sm text-[#8f9bac]">
          Everyone currently visible is already featured in the podium above.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03]">
          {rows.map((donor) => (
            <article
              key={donor.channelId}
              className="grid grid-cols-[90px_minmax(0,1.65fr)_180px_190px_150px] items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.015]"
            >
              <div className="text-[1.6rem] font-semibold tracking-[-0.04em] text-[#a9b4c3]">
                {donor.rank}
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <DonorAvatar donor={donor} size="lg" ringClassName="ring-1 ring-white/10" />
                <div className="min-w-0">
                  <p className="truncate text-[1.02rem] font-semibold text-[#f4f7fb]">
                    {donor.displayName}
                  </p>
                  <p className="truncate text-[12px] text-[#7f8c9d]">
                    {formatMemberSince(donor.firstSeenAt)}
                  </p>
                </div>
              </div>

              <div className="text-[15px] text-[#d7dee7]">
                {donor.messageCount} donation{donor.messageCount === 1 ? '' : 's'}
              </div>

              <div className="text-[15px] text-[#97a3b3]">
                {formatLeaderboardRecency(donor.lastSeenAt)}
              </div>

              <div className="text-right text-[1.55rem] font-semibold tracking-[-0.05em] text-[#f4f7fb]">
                {formatCurrency(donor.totalConverted, currency)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
