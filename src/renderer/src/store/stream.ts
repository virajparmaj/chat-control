import { create } from 'zustand'
import type {
  ActiveSessionSnapshot,
  BroadcastInfo,
  ResolvedLiveTarget,
  SessionSummary,
  StreamSession,
  StreamStatusEvent
} from '../../../shared/ipc-types'
import { normalizeIpcErrorMessage } from './auth'

type StreamErrorContext = 'creator' | 'target' | null

interface StreamState {
  broadcasts: BroadcastInfo[]
  resolvedTarget: ResolvedLiveTarget | null
  activeSession: StreamSession | null
  sessionSummary: SessionSummary | null
  streamStatus: StreamStatusEvent | null
  loading: boolean
  loadingContext: StreamErrorContext
  error: string | null
  errorContext: StreamErrorContext
  fetchBroadcasts: () => Promise<void>
  resolveTarget: (input: string) => Promise<void>
  clearResolvedTarget: () => void
  clearError: () => void
  startSession: (broadcastId: string) => Promise<void>
  startSessionFromTarget: (target: ResolvedLiveTarget) => Promise<void>
  stopSession: () => Promise<void>
  hydrateActiveSession: (snapshot: ActiveSessionSnapshot | null) => void
  setStreamStatus: (status: StreamStatusEvent | null) => void
  setSessionSummary: (summary: SessionSummary | null) => void
}

export const useStreamStore = create<StreamState>((set) => ({
  broadcasts: [],
  resolvedTarget: null,
  activeSession: null,
  sessionSummary: null,
  streamStatus: null,
  loading: false,
  loadingContext: null,
  error: null,
  errorContext: null,

  fetchBroadcasts: async () => {
    set({ loading: true, loadingContext: 'creator', error: null, errorContext: null })
    try {
      const broadcasts = await window.api.youtube.getBroadcasts()
      set({ broadcasts, loading: false, loadingContext: null, errorContext: null })
    } catch (error: unknown) {
      set({
        loading: false,
        loadingContext: null,
        error: normalizeIpcErrorMessage(
          error instanceof Error ? error.message : 'Failed to fetch broadcasts'
        ),
        errorContext: 'creator'
      })
    }
  },

  resolveTarget: async (input: string) => {
    set({
      loading: true,
      loadingContext: 'target',
      error: null,
      errorContext: null,
      resolvedTarget: null,
      sessionSummary: null
    })
    try {
      const resolvedTarget = await window.api.youtube.resolveTarget(input)
      set({ resolvedTarget, loading: false, loadingContext: null, errorContext: null })
    } catch (error: unknown) {
      set({
        loading: false,
        loadingContext: null,
        resolvedTarget: null,
        error: normalizeIpcErrorMessage(
          error instanceof Error ? error.message : 'Failed to resolve livestream target'
        ),
        errorContext: 'target'
      })
    }
  },

  clearResolvedTarget: () => {
    set({ resolvedTarget: null })
  },

  clearError: () => {
    set({ error: null, errorContext: null })
  },

  startSession: async (broadcastId: string) => {
    set({
      loading: true,
      loadingContext: 'creator',
      error: null,
      errorContext: null,
      sessionSummary: null,
      resolvedTarget: null
    })
    try {
      const session = await window.api.youtube.startSession(broadcastId)
      set({ activeSession: session, loading: false, loadingContext: null, errorContext: null })
    } catch (error: unknown) {
      set({
        loading: false,
        loadingContext: null,
        error: normalizeIpcErrorMessage(
          error instanceof Error ? error.message : 'Failed to start session'
        ),
        errorContext: 'creator'
      })
    }
  },

  startSessionFromTarget: async (target: ResolvedLiveTarget) => {
    set({
      loading: true,
      loadingContext: 'target',
      error: null,
      errorContext: null,
      sessionSummary: null
    })
    try {
      const session = await window.api.youtube.startSessionFromTarget(target)
      set({
        activeSession: session,
        resolvedTarget: null,
        loading: false,
        loadingContext: null,
        errorContext: null
      })
    } catch (error: unknown) {
      set({
        loading: false,
        loadingContext: null,
        error: normalizeIpcErrorMessage(
          error instanceof Error ? error.message : 'Failed to start session'
        ),
        errorContext: 'target'
      })
    }
  },

  stopSession: async () => {
    set({ loading: true, loadingContext: null, error: null, errorContext: null })
    try {
      const summary = await window.api.youtube.stopSession()
      set({
        activeSession: null,
        resolvedTarget: null,
        sessionSummary: summary,
        streamStatus: summary ? { type: 'ended', sessionId: summary.id } : null,
        loading: false,
        loadingContext: null,
        errorContext: null
      })
    } catch (error: unknown) {
      set({
        activeSession: null,
        loading: false,
        loadingContext: null,
        error: normalizeIpcErrorMessage(
          error instanceof Error ? error.message : 'Failed to stop session'
        ),
        errorContext: null
      })
    }
  },

  hydrateActiveSession: (snapshot: ActiveSessionSnapshot | null) => {
    set({
      resolvedTarget: null,
      activeSession: snapshot?.session ?? null,
      streamStatus: snapshot ? { type: 'connected', sessionId: snapshot.session.id } : null
    })
  },

  setStreamStatus: (status: StreamStatusEvent | null) => {
    set((state) => ({
      streamStatus: status,
      activeSession:
        status && (status.type === 'ended' || status.type === 'error') ? null : state.activeSession,
      error: status?.type === 'error' ? status.message : state.error,
      errorContext: status?.type === 'error' ? null : state.errorContext
    }))
  },

  setSessionSummary: (summary: SessionSummary | null) => {
    set({ sessionSummary: summary })
  }
}))
