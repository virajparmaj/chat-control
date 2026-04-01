import { formatCompactCurrency } from '../../lib/currency'
import type { SortOrder } from '../../../../shared/ipc-types'
import { SortControls } from './SortControls'

interface SummaryStripProps {
  total: number
  currency: string
  unreadCount: number
  savedCount: number
  sort: SortOrder
  onSortChange: (sort: SortOrder) => void
}

export function SummaryStrip({
  total,
  currency,
  unreadCount,
  savedCount,
  sort,
  onSortChange
}: SummaryStripProps): React.JSX.Element {
  return (
    <div className="shrink-0 border-b border-white/6 bg-[#111821] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-5">
          <Metric
            label="Total"
            value={formatCompactCurrency(total, currency)}
            valueClass="text-[#22c58b]"
          />
          <Metric
            label="Unread"
            value={String(unreadCount)}
            valueClass={unreadCount > 0 ? 'text-[#ff4b59]' : 'text-[#dbe4ef]'}
            indicator={unreadCount > 0}
          />
          <Metric
            label="Saved"
            value={String(savedCount)}
            valueClass={savedCount > 0 ? 'text-[#67a9ff]' : 'text-[#dbe4ef]'}
          />
        </div>
        <SortControls current={sort} onChange={onSortChange} />
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  valueClass,
  indicator = false
}: {
  label: string
  value: string
  valueClass: string
  indicator?: boolean
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#728095]">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className={`text-lg font-semibold tracking-[-0.03em] ${valueClass}`}>{value}</span>
        {indicator ? <span className="h-1.5 w-1.5 rounded-full bg-[#ff4b59]" /> : null}
      </div>
    </div>
  )
}
