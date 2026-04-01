import { create } from 'zustand'
import type { AppMeta, AppPreferences } from '../../../shared/ipc-types'
import { DEFAULT_PREFERENCES } from '../../../shared/ipc-types'

export type SettingsControlKey = keyof AppPreferences | 'clearLocalData'

interface SettingsState {
  preferences: AppPreferences
  appMeta: AppMeta | null
  loading: boolean
  appMetaLoading: boolean
  error: string | null
  saving: Partial<Record<SettingsControlKey, boolean>>
  clearingData: boolean
  clearDataConfirmOpen: boolean
  fetchPreferences: () => Promise<AppPreferences>
  fetchAppMeta: () => Promise<AppMeta | null>
  updatePreferences: (prefs: Partial<AppPreferences>) => Promise<AppPreferences>
  clearLocalData: () => Promise<AppPreferences>
  setPreferences: (preferences: AppPreferences) => void
  setError: (error: string | null) => void
  setClearDataConfirmOpen: (open: boolean) => void
}

function buildSavingPatch(
  patch: Partial<AppPreferences>,
  active: boolean
): Partial<Record<SettingsControlKey, boolean>> {
  const keys = Object.keys(patch) as Array<keyof AppPreferences>

  return keys.reduce<Partial<Record<SettingsControlKey, boolean>>>((acc, key) => {
    acc[key] = active
    return acc
  }, {})
}

export const useSettingsStore = create<SettingsState>((set) => ({
  preferences: DEFAULT_PREFERENCES,
  appMeta: null,
  loading: true,
  appMetaLoading: false,
  error: null,
  saving: {},
  clearingData: false,
  clearDataConfirmOpen: false,

  fetchPreferences: async () => {
    set({ loading: true, error: null })
    try {
      const preferences = await window.api.settings.get()
      set({ preferences, loading: false })
      return preferences
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to load your ChatControl settings.'
      set({ loading: false, error: message, preferences: DEFAULT_PREFERENCES })
      return DEFAULT_PREFERENCES
    }
  },

  fetchAppMeta: async () => {
    set({ appMetaLoading: true })
    try {
      const appMeta = await window.api.app.getMeta()
      set({ appMeta, appMetaLoading: false })
      return appMeta
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to load ChatControl version info.'
      set({ appMetaLoading: false, error: message })
      return null
    }
  },

  updatePreferences: async (prefs: Partial<AppPreferences>) => {
    set((state) => ({
      error: null,
      saving: {
        ...state.saving,
        ...buildSavingPatch(prefs, true)
      }
    }))

    try {
      const updated = await window.api.settings.update(prefs)
      set((state) => ({
        preferences: updated,
        saving: {
          ...state.saving,
          ...buildSavingPatch(prefs, false)
        }
      }))
      return updated
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to save your ChatControl settings.'
      set((state) => ({
        error: message,
        saving: {
          ...state.saving,
          ...buildSavingPatch(prefs, false)
        }
      }))
      throw error
    }
  },

  clearLocalData: async () => {
    set({
      error: null,
      clearingData: true
    })

    try {
      const preferences = await window.api.settings.clearLocalData()
      set({
        preferences,
        clearingData: false,
        clearDataConfirmOpen: false
      })
      return preferences
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to clear local ChatControl data.'
      set({
        error: message,
        clearingData: false
      })
      throw error
    }
  },

  setPreferences: (preferences: AppPreferences) => {
    set({ preferences, loading: false })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  setClearDataConfirmOpen: (open: boolean) => {
    set({ clearDataConfirmOpen: open })
  }
}))
