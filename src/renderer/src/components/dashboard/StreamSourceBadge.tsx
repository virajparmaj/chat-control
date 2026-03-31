import type { StreamSourceMode } from '../../../../shared/ipc-types'

export function StreamSourceBadge({
  sourceMode
}: {
  sourceMode?: StreamSourceMode | null
}): React.JSX.Element {
  const isPublic = sourceMode === 'public_video'

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isPublic
          ? 'border border-sky-500/30 bg-sky-500/10 text-sky-300'
          : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      {isPublic ? 'Public Stream' : 'My Active Stream'}
    </span>
  )
}
