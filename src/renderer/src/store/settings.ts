import { create } from 'zustand'
import type { AppPreferences } from '../../../shared/ipc-types'
import { DEFAULT_PREFERENCES } from '../../../shared/ipc-types'

interface SettingsState {
  preferences: AppPreferences
  loading: boolean
  fetchPreferences: () => Promise<AppPreferences>
  updatePreferences: (prefs: Partial<AppPreferences>) => Promise<AppPreferences>
  setPreferences: (preferences: AppPreferences) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  preferences: DEFAULT_PREFERENCES,
  loading: true,

  fetchPreferences: async () => {
    set({ loading: true })
    try {
      const preferences = await window.api.settings.get()
      set({ preferences, loading: false })
      return preferences
    } catch {
      set({ loading: false, preferences: DEFAULT_PREFERENCES })
      return DEFAULT_PREFERENCES
    }
  },

  updatePreferences: async (prefs: Partial<AppPreferences>) => {
    const updated = await window.api.settings.update(prefs)
    set({ preferences: updated })
    return updated
  },

  setPreferences: (preferences: AppPreferences) => {
    set({ preferences, loading: false })
  }
}))
