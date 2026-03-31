interface TierConfig {
  bg: string
  border: string
  text: string
  label: string
}

const TIER_CONFIGS: Record<number, TierConfig> = {
  1: {
    bg: 'bg-[#1565c0]/15',
    border: 'border-[#1565c0]/30',
    text: 'text-[#64b5f6]',
    label: 'Blue'
  },
  2: {
    bg: 'bg-[#00897b]/15',
    border: 'border-[#00897b]/30',
    text: 'text-[#4db6ac]',
    label: 'Cyan'
  },
  3: {
    bg: 'bg-[#2e7d32]/15',
    border: 'border-[#2e7d32]/30',
    text: 'text-[#81c784]',
    label: 'Green'
  },
  4: {
    bg: 'bg-[#e65100]/15',
    border: 'border-[#e65100]/30',
    text: 'text-[#ffb74d]',
    label: 'Yellow'
  },
  5: {
    bg: 'bg-[#c62828]/15',
    border: 'border-[#c62828]/30',
    text: 'text-[#ef5350]',
    label: 'Orange'
  },
  6: {
    bg: 'bg-[#ad1457]/15',
    border: 'border-[#ad1457]/30',
    text: 'text-[#f06292]',
    label: 'Magenta'
  },
  7: { bg: 'bg-[#880e4f]/15', border: 'border-[#880e4f]/30', text: 'text-[#f48fb1]', label: 'Red' }
}

const DEFAULT_TIER: TierConfig = {
  bg: 'bg-[#880e4f]/20',
  border: 'border-[#880e4f]/40',
  text: 'text-[#f48fb1]',
  label: 'Red+'
}

export function getTierConfig(tier: number): TierConfig {
  if (tier >= 7) return DEFAULT_TIER
  return TIER_CONFIGS[tier] ?? TIER_CONFIGS[1]!
}

export function getTierAccentColor(tier: number): string {
  const colors = ['#1565c0', '#00897b', '#2e7d32', '#e65100', '#c62828', '#ad1457', '#880e4f']
  const idx = Math.min(tier - 1, colors.length - 1)
  return colors[Math.max(0, idx)]
}
