import { create } from 'zustand'
import type { AuthStatus } from '../../../shared/ipc-types'

interface AuthState {
  status: AuthStatus
  loading: boolean
  error: string | null
  checkAuth: () => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
}

const DEFAULT_SIGNED_OUT_STATUS: AuthStatus = {
  authenticated: false,
  oauthConfigured: true
}

export function normalizeIpcErrorMessage(message: string): string {
  return message
    .replace(/^Error invoking remote method '[^']+':\s*/u, '')
    .replace(/^Error:\s*/u, '')
    .trim()
}

export const normalizeAuthErrorMessage = normalizeIpcErrorMessage

export const useAuthStore = create<AuthState>((set) => ({
  status: DEFAULT_SIGNED_OUT_STATUS,
  loading: true,
  error: null,

  checkAuth: async () => {
    set({ loading: true, error: null })
    try {
      const status = await window.api.auth.status()
      set({ status, loading: false })
    } catch {
      set({ status: DEFAULT_SIGNED_OUT_STATUS, loading: false })
    }
  },

  login: async () => {
    set({ loading: true, error: null })
    try {
      const status = await window.api.auth.login()
      set({ status, loading: false })
    } catch (err: unknown) {
      const message = normalizeIpcErrorMessage(err instanceof Error ? err.message : 'Login failed')
      set((state) => ({
        loading: false,
        error: message,
        status: {
          ...state.status,
          authenticated: false
        }
      }))
    }
  },

  logout: async () => {
    await window.api.auth.logout()
    set((state) => ({
      status: {
        authenticated: false,
        oauthConfigured: state.status.oauthConfigured,
        configurationError: state.status.configurationError
      },
      error: null,
      loading: false
    }))
  }
}))
