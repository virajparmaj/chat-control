import { cn } from '../../lib/utils'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
  xl: 'h-[84px] w-[84px]'
}

const TEXT_CLASSES: Record<AvatarSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-[1.8rem]'
}

const FALLBACK_SWATCHES = [
  'bg-[radial-gradient(circle_at_30%_30%,#ffcb4d,#f8b93a_55%,#d39117)]',
  'bg-[radial-gradient(circle_at_30%_30%,#bcc5d3,#96a1b3_58%,#737f92)]',
  'bg-[radial-gradient(circle_at_30%_30%,#ff4a5b,#ef233c_58%,#bf1124)]',
  'bg-[radial-gradient(circle_at_30%_30%,#66b2ff,#3f8efc_56%,#275ed9)]',
  'bg-[radial-gradient(circle_at_30%_30%,#39e2bc,#26c49a_55%,#15896b)]'
]

function getFallbackSwatch(seed: string): string {
  const index = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0)
  return FALLBACK_SWATCHES[index % FALLBACK_SWATCHES.length]
}

export function getDonorInitial(displayName: string): string {
  return displayName.trim().slice(0, 1).toUpperCase() || '?'
}

export function DonorAvatar({
  donor,
  size = 'md',
  ringClassName = 'ring-1 ring-white/10',
  fallbackClassName,
  className,
  textClassName
}: {
  donor: { displayName: string; avatarUrl: string | null }
  size?: AvatarSize
  ringClassName?: string
  fallbackClassName?: string
  className?: string
  textClassName?: string
}): React.JSX.Element {
  const sizeClass = SIZE_CLASSES[size]

  if (donor.avatarUrl) {
    return (
      <img
        src={donor.avatarUrl}
        alt=""
        className={cn(sizeClass, 'shrink-0 rounded-full object-cover', ringClassName, className)}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        sizeClass,
        'flex shrink-0 items-center justify-center rounded-full',
        fallbackClassName ?? getFallbackSwatch(donor.displayName),
        ringClassName,
        className
      )}
    >
      <span className={cn('font-semibold uppercase text-[#f4f7fb]', TEXT_CLASSES[size], textClassName)}>
        {getDonorInitial(donor.displayName)}
      </span>
    </div>
  )
}
