import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createDashboardWindow } from './windows/dashboard'
import { applyOverlayPreferences, setOverlayLocked, toggleOverlayWindow } from './windows/overlay'
import { closeDatabase, getQueries } from './services/database'
import { registerAuthHandlers } from './ipc/auth.ipc'
import { registerYouTubeHandlers } from './ipc/youtube.ipc'
import { getAppPreferences, updateAppPreferences } from './services/preferences'
import { initializeSessionManager, shutdownSessionManager } from './services/session-manager'
import {
  broadcastSessionStats,
  broadcastSettingsChanged,
  broadcastSuperchatUpdated
} from './services/runtime-events'
import type { AppPreferences, PaidMessage, PaidMessageState, SortOrder } from '../shared/ipc-types'

function normalizeMessageId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function normalizeSettingsPatch(value: unknown): Partial<AppPreferences> {
  return typeof value === 'object' && value !== null ? (value as Partial<AppPreferences>) : {}
}

function registerCoreHandlers(): void {
  const queries = getQueries()

  ipcMain.handle('settings:get', () => {
    return getAppPreferences()
  })

  ipcMain.handle('settings:update', (_event, patch: unknown) => {
    const updated = updateAppPreferences(normalizeSettingsPatch(patch))
    applyOverlayPreferences(updated)
    broadcastSettingsChanged(updated)
    return updated
  })

  ipcMain.handle(
    'superchat:list',
    (_event, sessionId: string, state?: PaidMessageState, sort?: SortOrder) => {
      return queries.listPaidMessages(sessionId, state, sort)
    }
  )

  const handleMessageStateChange = (
    messageId: unknown,
    state: PaidMessageState
  ): PaidMessage | null => {
    const normalizedId = normalizeMessageId(messageId)
    if (!normalizedId) return null

    const updated = queries.updateMessageState(normalizedId, state)
    if (updated) {
      broadcastSuperchatUpdated(updated)
      broadcastSessionStats(updated.sessionId)
    }

    return updated
  }

  ipcMain.handle('superchat:mark-read', (_event, messageId: unknown) => {
    return handleMessageStateChange(messageId, 'read')
  })

  ipcMain.handle('superchat:save', (_event, messageId: unknown) => {
    return handleMessageStateChange(messageId, 'saved')
  })

  ipcMain.handle('superchat:undo', (_event, messageId: unknown) => {
    return handleMessageStateChange(messageId, 'unread')
  })

  ipcMain.handle('donors:list', (_event, sessionId: string) => {
    return queries.listDonors(sessionId)
  })

  ipcMain.handle('sessions:list', () => {
    return queries.listSessions()
  })

  ipcMain.handle('sessions:summary', (_event, sessionId: string) => {
    return queries.getSessionSummary(sessionId)
  })

  ipcMain.handle('window:overlay-toggle', () => {
    toggleOverlayWindow()
  })

  ipcMain.handle('window:overlay-lock', (_event, locked: boolean) => {
    const updated = updateAppPreferences({ overlayLocked: Boolean(locked) })
    setOverlayLocked(updated.overlayLocked)
    broadcastSettingsChanged(updated)
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.chatcontrol')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerCoreHandlers()
  registerAuthHandlers()
  registerYouTubeHandlers()

  createDashboardWindow()
  applyOverlayPreferences(getAppPreferences())
  void initializeSessionManager()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDashboardWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  shutdownSessionManager()
  closeDatabase()
})
