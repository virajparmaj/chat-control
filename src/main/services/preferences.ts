import type { AppPreferences } from '../../shared/ipc-types'
import { DEFAULT_PREFERENCES } from '../../shared/ipc-types'
import { mergePreferences, sanitizePreferences } from '../../shared/preferences'
import { getQueries } from './database'

export function getAppPreferences(): AppPreferences {
  const raw = getQueries().getPreference('app_preferences')
  if (!raw) return DEFAULT_PREFERENCES

  try {
    return sanitizePreferences(JSON.parse(raw))
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function updateAppPreferences(patch: Partial<AppPreferences>): AppPreferences {
  const current = getAppPreferences()
  const updated = mergePreferences(current, patch)
  getQueries().setPreference('app_preferences', JSON.stringify(updated))
  return updated
}
