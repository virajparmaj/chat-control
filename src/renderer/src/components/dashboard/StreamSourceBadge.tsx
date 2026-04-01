import type { StreamSourceMode } from '../../../../shared/ipc-types'

export function StreamSourceBadge({
  sourceMode,
  compact = false
}: {
  sourceMode?: StreamSourceMode | null
  compact?: boolean
}): React.JSX.Element {
  const isPublic = sourceMode === 'public_video'

  return (
    <span
      className={`inline-flex items-center border font-semibold uppercase ${
        compact
          ? 'rounded-[8px] px-2 py-0.5 text-[10px] tracking-[0.14em]'
          : 'rounded-full px-2.5 py-1 text-[10px] tracking-[0.18em]'
      } ${
        isPublic
          ? 'border-[#35455f] bg-[#182131] text-[#c4d0df]'
          : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300'
      }`}
    >
      {isPublic ? 'Public Stream' : 'Connected Channel'}
    </span>
  )
}
