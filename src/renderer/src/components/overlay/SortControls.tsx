import { ChevronDown } from 'lucide-react'
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
    <div className="relative w-[108px] shrink-0">
      <select
        aria-label="Sort messages"
        value={current}
        onChange={(event) => onChange(event.target.value as SortOrder)}
        className="h-9 w-full appearance-none rounded-[10px] border border-white/7 bg-[#1a212c] px-3 pr-8 text-sm font-medium text-[#e8edf3] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-colors hover:border-white/12 focus:border-[#6f7c91] focus:ring-2 focus:ring-white/6"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#778397]" />
    </div>
  )
}
