import { ipcMain } from 'electron'
import type {
  BroadcastInfo,
  ResolvedLiveTarget,
  SessionSummary,
  StreamSession
} from '../../shared/ipc-types'
import { getActiveBroadcasts, resolveLiveTarget } from '../services/youtube-api'
import {
  getActiveSessionSnapshot,
  startMonitoringSession,
  startMonitoringSessionFromTarget,
  stopMonitoringSession
} from '../services/session-manager'

export function registerYouTubeHandlers(): void {
  ipcMain.handle('youtube:get-broadcasts', async (): Promise<BroadcastInfo[]> => {
    return getActiveBroadcasts()
  })

  ipcMain.handle(
    'youtube:resolve-target',
    async (_event, input: string): Promise<ResolvedLiveTarget> => {
      return resolveLiveTarget(input)
    }
  )

  ipcMain.handle(
    'youtube:start-session',
    async (_event, broadcastId: string): Promise<StreamSession> => {
      return startMonitoringSession(broadcastId)
    }
  )

  ipcMain.handle(
    'youtube:start-session-from-target',
    async (_event, target: ResolvedLiveTarget): Promise<StreamSession> => {
      return startMonitoringSessionFromTarget(target)
    }
  )

  ipcMain.handle('youtube:stop-session', async (): Promise<SessionSummary | null> => {
    return stopMonitoringSession()
  })

  ipcMain.handle('sessions:get-active', async () => {
    return getActiveSessionSnapshot()
  })
}
