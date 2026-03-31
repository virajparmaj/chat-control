import { formatCompactCurrency } from '../../lib/currency'

interface SummaryStripProps {
  total: number
  currency: string
  unreadCount: number
  savedCount: number
}

export function SummaryStrip({
  total,
  currency,
  unreadCount,
  savedCount
}: SummaryStripProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-card/50 border-b border-border text-xs shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">
          Total:{' '}
          <span className="text-foreground font-semibold">
            {formatCompactCurrency(total, currency)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Unread:{' '}
          <span className={`font-medium ${unreadCount > 0 ? 'text-primary' : 'text-foreground'}`}>
            {unreadCount}
          </span>
        </span>
      </div>
      <span className="text-muted-foreground">
        Saved:{' '}
        <span className={`font-medium ${savedCount > 0 ? 'text-yellow-400' : 'text-foreground'}`}>
          {savedCount}
        </span>
      </span>
    </div>
  )
}
