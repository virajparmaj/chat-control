import type { AppPreferences, SortOrder } from './ipc-types'
import { DEFAULT_PREFERENCES } from './ipc-types'

function isSortOrder(value: unknown): value is SortOrder {
  return value === 'latest' || value === 'oldest' || value === 'highest'
}

function normalizeOverlayOpacity(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_PREFERENCES.overlayOpacity
  }

  return Math.min(100, Math.max(40, Math.round(value)))
}

export function sanitizePreferences(input: unknown): AppPreferences {
  const candidate = typeof input === 'object' && input !== null ? input : {}
  const prefs = candidate as Partial<AppPreferences>

  return {
    preferredCurrency:
      typeof prefs.preferredCurrency === 'string' && prefs.preferredCurrency.length > 0
        ? prefs.preferredCurrency.toUpperCase()
        : DEFAULT_PREFERENCES.preferredCurrency,
    defaultSort: isSortOrder(prefs.defaultSort)
      ? prefs.defaultSort
      : DEFAULT_PREFERENCES.defaultSort,
    soundEnabled:
      typeof prefs.soundEnabled === 'boolean'
        ? prefs.soundEnabled
        : DEFAULT_PREFERENCES.soundEnabled,
    desktopNotificationsEnabled:
      typeof prefs.desktopNotificationsEnabled === 'boolean'
        ? prefs.desktopNotificationsEnabled
        : DEFAULT_PREFERENCES.desktopNotificationsEnabled,
    overlayAlwaysOnTop:
      typeof prefs.overlayAlwaysOnTop === 'boolean'
        ? prefs.overlayAlwaysOnTop
        : DEFAULT_PREFERENCES.overlayAlwaysOnTop,
    overlayLocked:
      typeof prefs.overlayLocked === 'boolean'
        ? prefs.overlayLocked
        : DEFAULT_PREFERENCES.overlayLocked,
    compactMode:
      typeof prefs.compactMode === 'boolean' ? prefs.compactMode : DEFAULT_PREFERENCES.compactMode,
    overlayOpacity: normalizeOverlayOpacity(prefs.overlayOpacity),
    theme: 'dark'
  }
}

export function mergePreferences(
  current: AppPreferences,
  patch: Partial<AppPreferences> | unknown
): AppPreferences {
  const normalizedPatch =
    typeof patch === 'object' && patch !== null ? (patch as Partial<AppPreferences>) : {}

  return sanitizePreferences({
    ...current,
    ...normalizedPatch
  })
}
