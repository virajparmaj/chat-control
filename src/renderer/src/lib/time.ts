export function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatLeaderboardRecency(
  dateStr: string,
  now = new Date()
): string {
  const target = new Date(dateStr)
  const diffMs = now.getTime() - target.getTime()
  const hourMs = 60 * 60 * 1000
  const dayMs = 24 * hourMs
  const diffDays = Math.floor(diffMs / dayMs)

  const isSameDay =
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  if (isSameDay) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    target.getFullYear() === yesterday.getFullYear() &&
    target.getMonth() === yesterday.getMonth() &&
    target.getDate() === yesterday.getDate()
  if (isYesterday) return 'Yesterday'

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)))
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }

  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs))
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }

  if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
  }

  const weeks = Math.floor(diffDays / 7)
  if (weeks < 5) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() === target.getFullYear() ? undefined : 'numeric'
  }).format(target)
}

export function formatMemberSince(dateStr: string): string {
  return `Member since ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateStr))}`
}
