import type { SortOrder } from '../../../../shared/ipc-types'

interface SortControlsProps {
  current: SortOrder
  onChange: (sort: SortOrder) => void
}

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest', label: 'Highest' }
]

export function SortControls({ current, onChange }: SortControlsProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 text-xs">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-0.5 rounded transition-colors ${
            current === opt.value
              ? 'bg-secondary text-foreground font-medium'
              : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
