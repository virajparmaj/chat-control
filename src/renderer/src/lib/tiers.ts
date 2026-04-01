interface TierConfig {
  bg: string
  bgActive: string
  border: string
  borderActive: string
  text: string
  accent: string
  avatarBg: string
  avatarText: string
  label: string
}

const TIER_CONFIGS: Record<number, TierConfig> = {
  1: {
    bg: 'bg-[#267be8]/15',
    bgActive: 'bg-[#267be8]/24',
    border: 'border-[#267be8]/30',
    borderActive: 'border-[#267be8]/48',
    text: 'text-[#67afff]',
    accent: '#4b9eff',
    avatarBg: 'bg-[#4b9eff]',
    avatarText: 'text-white',
    label: 'Blue'
  },
  2: {
    bg: 'bg-[#1e968f]/15',
    bgActive: 'bg-[#1e968f]/24',
    border: 'border-[#1e968f]/30',
    borderActive: 'border-[#1e968f]/48',
    text: 'text-[#63d0c6]',
    accent: '#1e968f',
    avatarBg: 'bg-[#28b5a9]',
    avatarText: 'text-white',
    label: 'Teal'
  },
  3: {
    bg: 'bg-[#1f9a62]/15',
    bgActive: 'bg-[#1f9a62]/24',
    border: 'border-[#1f9a62]/30',
    borderActive: 'border-[#1f9a62]/48',
    text: 'text-[#50d48f]',
    accent: '#20b874',
    avatarBg: 'bg-[#28cb82]',
    avatarText: 'text-white',
    label: 'Green'
  },
  4: {
    bg: 'bg-[#aa8120]/15',
    bgActive: 'bg-[#aa8120]/24',
    border: 'border-[#aa8120]/30',
    borderActive: 'border-[#aa8120]/48',
    text: 'text-[#e5bf54]',
    accent: '#c7a13c',
    avatarBg: 'bg-[#f0c245]',
    avatarText: 'text-white',
    label: 'Gold'
  },
  5: {
    bg: 'bg-[#a83d2f]/15',
    bgActive: 'bg-[#a83d2f]/24',
    border: 'border-[#a83d2f]/30',
    borderActive: 'border-[#a83d2f]/48',
    text: 'text-[#ef8768]',
    accent: '#c8573b',
    avatarBg: 'bg-[#e06a4e]',
    avatarText: 'text-white',
    label: 'Vermilion'
  },
  6: {
    bg: 'bg-[#a01f35]/15',
    bgActive: 'bg-[#a01f35]/24',
    border: 'border-[#a01f35]/30',
    borderActive: 'border-[#a01f35]/48',
    text: 'text-[#f1687a]',
    accent: '#cf3148',
    avatarBg: 'bg-[#ea4154]',
    avatarText: 'text-white',
    label: 'Crimson'
  },
  7: {
    bg: 'bg-[#a01623]/17',
    bgActive: 'bg-[#a01623]/26',
    border: 'border-[#a01623]/34',
    borderActive: 'border-[#a01623]/52',
    text: 'text-[#ff6673]',
    accent: '#e11d2e',
    avatarBg: 'bg-[#ff2940]',
    avatarText: 'text-white',
    label: 'Red'
  }
}

const DEFAULT_TIER: TierConfig = {
  bg: 'bg-[#a01623]/18',
  bgActive: 'bg-[#a01623]/28',
  border: 'border-[#a01623]/36',
  borderActive: 'border-[#a01623]/54',
  text: 'text-[#ff6673]',
  accent: '#e11d2e',
  avatarBg: 'bg-[#ff2940]',
  avatarText: 'text-white',
  label: 'Red+'
}

export function getTierConfig(tier: number): TierConfig {
  if (tier >= 7) return DEFAULT_TIER
  return TIER_CONFIGS[tier] ?? TIER_CONFIGS[1]!
}

export function getTierAccentColor(tier: number): string {
  const colors = ['#4b9eff', '#1e968f', '#20b874', '#c7a13c', '#c8573b', '#cf3148', '#e11d2e']
  const idx = Math.min(tier - 1, colors.length - 1)
  return colors[Math.max(0, idx)]
}
