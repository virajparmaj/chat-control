import type { AppPreferences, SortOrder } from './ipc-types'
import { DEFAULT_PREFERENCES } from './ipc-types'

function isSortOrder(value: unknown): value is SortOrder {
  return value === 'latest' || value === 'oldest' || value === 'highest'
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
