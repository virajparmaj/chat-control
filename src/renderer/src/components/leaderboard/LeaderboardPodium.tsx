import { Crown } from 'lucide-react'
import { formatCurrency } from '../../lib/currency'
import { DonorAvatar } from '../shared/DonorAvatar'
import type { RankedLeaderboardDonor } from '../../../../shared/leaderboard'
import { cn } from '../../lib/utils'

const podiumThemes = {
  first: {
    cardClass:
      'border-[#6d5320] bg-[linear-gradient(180deg,rgba(63,44,14,0.95),rgba(51,23,29,0.98))] shadow-[0_24px_64px_rgba(0,0,0,0.32),0_0_0_1px_rgba(209,164,63,0.06)]',
    pillClass: 'bg-[#7f5b17]/60 text-[#f4c85b]',
    accentClass: 'text-[#f4c85b]',
    valueClass: 'text-[#20d29e]',
    avatarRingClass: 'ring-2 ring-[#f4c85b]',
    avatarFallbackClass:
      'border border-[#f4c742] bg-[radial-gradient(circle_at_30%_30%,#ff3148,#f61d3e_58%,#d30f28)]'
  },
  second: {
    cardClass:
      'border-[#1e3d61] bg-[linear-gradient(180deg,rgba(15,30,49,0.98),rgba(14,21,31,0.98))] shadow-[0_20px_54px_rgba(0,0,0,0.28)]',
    pillClass: 'bg-[#183f72] text-[#5fa4ff]',
    accentClass: 'text-[#66aafc]',
    valueClass: 'text-[#f4f7fb]',
    avatarRingClass: 'ring-2 ring-[#5b98ff]/35',
    avatarFallbackClass:
      'bg-[radial-gradient(circle_at_30%_30%,#60a5ff,#3b82f6_55%,#2957d9)]'
  },
  third: {
    cardClass:
      'border-[#14583f] bg-[linear-gradient(180deg,rgba(9,45,37,0.98),rgba(11,22,21,0.98))] shadow-[0_20px_54px_rgba(0,0,0,0.28)]',
    pillClass: 'bg-[#0f5a4a] text-[#2ace9f]',
    accentClass: 'text-[#2ad0a2]',
    valueClass: 'text-[#f4f7fb]',
    avatarRingClass: 'ring-2 ring-[#1fbe94]/30',
    avatarFallbackClass:
      'bg-[radial-gradient(circle_at_30%_30%,#43e1bc,#26c49a_55%,#15896b)]'
  }
} as const

export function LeaderboardPodium({
  donors,
  currency
}: {
  donors: RankedLeaderboardDonor[]
  currency: string
}): React.JSX.Element {
  const centerDonor = donors[0] ?? null
  const leftDonor = donors[1] ?? null
  const rightDonor = donors[2] ?? null

  if (donors.length === 1 && centerDonor) {
    return (
      <section className="mx-auto max-w-[420px]">
        <PodiumCard donor={centerDonor} slot="first" align="center" currency={currency} />
      </section>
    )
  }

  if (donors.length === 2 && centerDonor && leftDonor) {
    return (
      <section className="grid items-end gap-4 xl:grid-cols-[1fr_1.08fr_1fr]">
        <PodiumCard donor={leftDonor} slot="second" align="left" currency={currency} />
        <PodiumCard donor={centerDonor} slot="first" align="center" currency={currency} />
        <div className="hidden xl:block" aria-hidden="true" />
      </section>
    )
  }

  return (
    <section className="grid items-end gap-4 xl:grid-cols-[1fr_1.08fr_1fr]">
      <PodiumCard donor={leftDonor} slot="second" align="left" currency={currency} />
      <PodiumCard donor={centerDonor} slot="first" align="center" currency={currency} />
      <PodiumCard donor={rightDonor} slot="third" align="right" currency={currency} />
    </section>
  )
}

function PodiumCard({
  donor,
  slot,
  align,
  currency
}: {
  donor: RankedLeaderboardDonor | null
  slot: 'first' | 'second' | 'third'
  align: 'left' | 'center' | 'right'
  currency?: string
}): React.JSX.Element {
  if (!donor || !currency) {
    return <div className="hidden xl:block" aria-hidden="true" />
  }

  const theme = podiumThemes[slot]
  const isFirst = slot === 'first'

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[28px] px-6 pb-6 pt-5 transition-transform duration-200 hover:-translate-y-[2px]',
        isFirst ? 'min-h-[268px]' : 'min-h-[210px]',
        theme.cardClass
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      <div
        className={cn(
          'flex',
          isFirst ? 'justify-center' : align === 'left' ? 'justify-center xl:justify-start' : 'justify-center xl:justify-end'
        )}
      >
        <span
          className={cn(
            'inline-flex min-h-8 items-center justify-center rounded-full px-4 text-[12px] font-semibold',
            theme.pillClass
          )}
        >
          {isFirst ? (
            <span className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span>{formatRankLabel(donor.rank, true)}</span>
            </span>
          ) : (
            formatRankLabel(donor.rank)
          )}
        </span>
      </div>

      <div className={cn('mt-6 flex flex-col items-center text-center', isFirst ? 'gap-5' : 'gap-4')}>
        <DonorAvatar
          donor={donor}
          size={isFirst ? 'xl' : 'xl'}
          ringClassName={theme.avatarRingClass}
          fallbackClassName={theme.avatarFallbackClass}
          className={isFirst ? 'h-[86px] w-[86px]' : 'h-[60px] w-[60px] xl:h-[68px] xl:w-[68px]'}
          textClassName={isFirst ? 'text-[1.7rem]' : 'text-xl'}
        />

        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-display font-semibold tracking-[-0.05em] text-[#f4f7fb]',
              isFirst ? 'text-[2rem]' : 'text-[1.35rem]'
            )}
          >
            {donor.displayName}
          </p>
          <p
            className={cn(
              'mt-3 font-semibold tracking-[-0.05em]',
              isFirst ? 'text-[2.25rem]' : 'text-[1.85rem]',
              theme.valueClass
            )}
          >
            {formatCurrency(donor.totalConverted, currency)}
          </p>
          <p className="mt-1 text-[12px] text-[#95a1b2]">
            {donor.messageCount} donation{donor.messageCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </article>
  )
}

function formatRankLabel(rank: number, includePlace = false): string {
  const value = `${rank}${getOrdinalSuffix(rank)}`
  return includePlace ? `${value} Place` : value
}

function getOrdinalSuffix(rank: number): string {
  const remainder = rank % 100
  if (remainder >= 11 && remainder <= 13) return 'th'

  switch (rank % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}
