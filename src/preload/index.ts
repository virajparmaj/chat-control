import { contextBridge, ipcRenderer } from 'electron'
import type {
  ActiveSessionSnapshot,
  AppMeta,
  AppPreferences,
  AuthStatus,
  BroadcastInfo,
  DonorAggregate,
  LeaderboardDonorAggregate,
  LeaderboardScope,
  PaidMessage,
  PaidMessageState,
  ResolvedLiveTarget,
  SavedArchiveItem,
  SessionReport,
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
    listSaved: (sort?: SortOrder): Promise<SavedArchiveItem[]> =>
      ipcRenderer.invoke('superchat:list-saved', sort),
    markRead: (messageId: string): Promise<PaidMessage | null> =>
      ipcRenderer.invoke('superchat:mark-read', messageId),
    save: (messageId: string): Promise<PaidMessage | null> =>
      ipcRenderer.invoke('superchat:save', messageId),
    undo: (messageId: string): Promise<PaidMessage | null> =>
      ipcRenderer.invoke('superchat:undo', messageId),
    markAllRead: (sessionId: string): Promise<PaidMessage[]> =>
      ipcRenderer.invoke('superchat:mark-all-read', sessionId),
    clearSaved: (): Promise<PaidMessage[]> => ipcRenderer.invoke('superchat:clear-saved'),
    exportSaved: (sort?: SortOrder): Promise<string | null> =>
      ipcRenderer.invoke('superchat:export-saved', sort),
    copyText: (messageId: string): Promise<string | null> =>
      ipcRenderer.invoke('superchat:copy-text', messageId)
  },
  donors: {
    list: (sessionId: string): Promise<DonorAggregate[]> =>
      ipcRenderer.invoke('donors:list', sessionId),
    listAllTime: (): Promise<LeaderboardDonorAggregate[]> =>
      ipcRenderer.invoke('donors:list-all-time'),
    exportLeaderboard: (scope: LeaderboardScope): Promise<string | null> =>
      ipcRenderer.invoke('donors:export-leaderboard', scope)
  },
  sessions: {
    list: (): Promise<StreamSession[]> => ipcRenderer.invoke('sessions:list'),
    summary: (sessionId: string): Promise<SessionSummary | null> =>
      ipcRenderer.invoke('sessions:summary', sessionId),
    report: (sessionId: string): Promise<SessionReport | null> =>
      ipcRenderer.invoke('sessions:report', sessionId),
    getActive: (): Promise<ActiveSessionSnapshot | null> =>
      ipcRenderer.invoke('sessions:get-active'),
    exportCsv: (sessionId: string): Promise<string | null> =>
      ipcRenderer.invoke('sessions:export-csv', sessionId),
    copySummary: (sessionId: string): Promise<string | null> =>
      ipcRenderer.invoke('sessions:copy-summary', sessionId)
  },
  settings: {
    get: (): Promise<AppPreferences> => ipcRenderer.invoke('settings:get'),
    update: (prefs: Partial<AppPreferences>): Promise<AppPreferences> =>
      ipcRenderer.invoke('settings:update', prefs),
    clearLocalData: (): Promise<AppPreferences> => ipcRenderer.invoke('settings:clear-local-data')
  },
  app: {
    getMeta: (): Promise<AppMeta> => ipcRenderer.invoke('app:get-meta')
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
