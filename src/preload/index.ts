import { contextBridge, ipcRenderer } from 'electron'
import type {
  ActiveSessionSnapshot,
  AppPreferences,
  AuthStatus,
  BroadcastInfo,
  DonorAggregate,
  PaidMessage,
  PaidMessageState,
  ResolvedLiveTarget,
  SessionStats,
  SessionSummary,
  SortOrder,
  StreamSession,
  StreamStatusEvent
} from '../shared/ipc-types'

const api = {
  auth: {
    login: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:login'),
    logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),
    status: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:status')
  },
  youtube: {
    getBroadcasts: (): Promise<BroadcastInfo[]> => ipcRenderer.invoke('youtube:get-broadcasts'),
    resolveTarget: (input: string): Promise<ResolvedLiveTarget> =>
      ipcRenderer.invoke('youtube:resolve-target', input),
    startSession: (broadcastId: string): Promise<StreamSession> =>
      ipcRenderer.invoke('youtube:start-session', broadcastId),
    startSessionFromTarget: (target: ResolvedLiveTarget): Promise<StreamSession> =>
      ipcRenderer.invoke('youtube:start-session-from-target', target),
    stopSession: (): Promise<SessionSummary | null> => ipcRenderer.invoke('youtube:stop-session')
  },
  superchats: {
    list: (sessionId: string, state?: PaidMessageState, sort?: SortOrder): Promise<PaidMessage[]> =>
      ipcRenderer.invoke('superchat:list', sessionId, state, sort),
    markRead: (messageId: string): Promise<PaidMessage | null> =>
      ipcRenderer.invoke('superchat:mark-read', messageId),
    save: (messageId: string): Promise<PaidMessage | null> =>
      ipcRenderer.invoke('superchat:save', messageId),
    undo: (messageId: string): Promise<PaidMessage | null> =>
      ipcRenderer.invoke('superchat:undo', messageId)
  },
  donors: {
    list: (sessionId: string): Promise<DonorAggregate[]> =>
      ipcRenderer.invoke('donors:list', sessionId)
  },
  sessions: {
    list: (): Promise<StreamSession[]> => ipcRenderer.invoke('sessions:list'),
    summary: (sessionId: string): Promise<SessionSummary | null> =>
      ipcRenderer.invoke('sessions:summary', sessionId),
    getActive: (): Promise<ActiveSessionSnapshot | null> =>
      ipcRenderer.invoke('sessions:get-active')
  },
  settings: {
    get: (): Promise<AppPreferences> => ipcRenderer.invoke('settings:get'),
    update: (prefs: Partial<AppPreferences>): Promise<AppPreferences> =>
      ipcRenderer.invoke('settings:update', prefs)
  },
  window: {
    toggleOverlay: (): Promise<void> => ipcRenderer.invoke('window:overlay-toggle'),
    lockOverlay: (locked: boolean): Promise<void> =>
      ipcRenderer.invoke('window:overlay-lock', locked)
  },
  on: {
    sessionActive: (callback: (snapshot: ActiveSessionSnapshot | null) => void): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        snapshot: ActiveSessionSnapshot | null
      ): void => callback(snapshot)
      ipcRenderer.on('session:active', handler)
      return () => ipcRenderer.removeListener('session:active', handler)
    },
    newSuperchat: (callback: (message: PaidMessage) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, message: PaidMessage): void =>
        callback(message)
      ipcRenderer.on('superchat:new', handler)
      return () => ipcRenderer.removeListener('superchat:new', handler)
    },
    superchatUpdated: (callback: (message: PaidMessage) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, message: PaidMessage): void =>
        callback(message)
      ipcRenderer.on('superchat:updated', handler)
      return () => ipcRenderer.removeListener('superchat:updated', handler)
    },
    donorsUpdated: (callback: (donors: DonorAggregate[]) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, donors: DonorAggregate[]): void =>
        callback(donors)
      ipcRenderer.on('donors:updated', handler)
      return () => ipcRenderer.removeListener('donors:updated', handler)
    },
    sessionStats: (callback: (stats: SessionStats) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, stats: SessionStats): void =>
        callback(stats)
      ipcRenderer.on('session:stats', handler)
      return () => ipcRenderer.removeListener('session:stats', handler)
    },
    streamStatus: (callback: (status: StreamStatusEvent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: StreamStatusEvent): void =>
        callback(status)
      ipcRenderer.on('stream:status', handler)
      return () => ipcRenderer.removeListener('stream:status', handler)
    },
    sessionSummary: (callback: (summary: SessionSummary) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, summary: SessionSummary): void =>
        callback(summary)
      ipcRenderer.on('session:summary', handler)
      return () => ipcRenderer.removeListener('session:summary', handler)
    },
    settingsChanged: (callback: (preferences: AppPreferences) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, preferences: AppPreferences): void =>
        callback(preferences)
      ipcRenderer.on('settings:changed', handler)
      return () => ipcRenderer.removeListener('settings:changed', handler)
    }
  }
}

export type ChatControlAPI = typeof api

if (!process.contextIsolated) {
  throw new Error('ChatControl requires contextIsolation to be enabled.')
}

contextBridge.exposeInMainWorld('api', api)
