import { app, BrowserWindow, clipboard, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createDashboardWindow } from './windows/dashboard'
import { applyOverlayPreferences, setOverlayLocked, toggleOverlayWindow } from './windows/overlay'
import { closeDatabase, getQueries } from './services/database'
import { registerAuthHandlers } from './ipc/auth.ipc'
import { registerYouTubeHandlers } from './ipc/youtube.ipc'
import { getAppPreferences, updateAppPreferences } from './services/preferences'
import { initializeSessionManager, shutdownSessionManager } from './services/session-manager'
import {
  broadcastActiveSession,
  broadcastSessionStats,
  broadcastSettingsChanged,
  broadcastSuperchatUpdated
} from './services/runtime-events'
import type {
  AppPreferences,
  DonorAggregate,
  LeaderboardDonorAggregate,
  LeaderboardScope,
  PaidMessage,
  PaidMessageState,
  SessionSummary,
  SortOrder
} from '../shared/ipc-types'
import { rankLeaderboardDonors } from '../shared/leaderboard'

function normalizeMessageId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function normalizeSettingsPatch(value: unknown): Partial<AppPreferences> {
  return typeof value === 'object' && value !== null ? (value as Partial<AppPreferences>) : {}
}

function normalizeSortOrder(value: unknown, fallback: SortOrder = 'latest'): SortOrder {
  if (value === 'latest' || value === 'oldest' || value === 'highest') {
    return value
  }
  return fallback
}

function normalizeLeaderboardScope(value: unknown): LeaderboardScope | null {
  return value === 'stream' || value === 'all_time' ? value : null
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .toLowerCase()
}

function csvEscape(value: string | number | null): string {
  if (value === null) return ''
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function buildSummaryText(
  summary: SessionSummary,
  donors: DonorAggregate[],
  unreadCount: number
): string {
  const lines = [
    `ChatControl Session Summary`,
    `Title: ${summary.title ?? 'Untitled Stream'}`,
    `Started: ${new Date(summary.startedAt).toLocaleString()}`,
    `Status: ${summary.status === 'active' ? 'Live' : summary.status}`,
    `Total Raised: ${summary.totalConverted.toFixed(2)} ${summary.convertedCurrency ?? 'USD'}`,
    `Super Chats: ${summary.messageCount - summary.stickerCount}`,
    `Super Stickers: ${summary.stickerCount}`,
    `Unread: ${unreadCount}`,
    `Saved: ${summary.savedCount}`
  ]

  if (summary.highestDonor) {
    lines.push(
      `Top Donor: ${summary.highestDonor.displayName} (${summary.highestDonor.totalConverted.toFixed(2)} ${summary.convertedCurrency ?? 'USD'})`
    )
  }

  if (donors.length > 0) {
    lines.push('', 'Leaderboard:')
    donors.slice(0, 5).forEach((donor, index) => {
      lines.push(
        `${index + 1}. ${donor.displayName} - ${donor.totalConverted.toFixed(2)} ${summary.convertedCurrency ?? 'USD'}`
      )
    })
  }

  return lines.join('\n')
}

function buildLeaderboardCsv(
  donors: LeaderboardDonorAggregate[],
  scope: LeaderboardScope
): string | null {
  const rankedDonors = rankLeaderboardDonors(donors)
  if (rankedDonors.length === 0) return null

  const rows = [
    [
      'rank',
      'scope',
      'donor_display_name',
      'channel_id',
      'donation_count',
      'last_donation_at',
      'member_since',
      'total_converted'
    ],
    ...rankedDonors.map((donor) => [
      donor.rank,
      scope,
      donor.displayName,
      donor.channelId,
      donor.messageCount,
      donor.lastSeenAt,
      donor.firstSeenAt,
      donor.totalConverted.toFixed(2)
    ])
  ]

  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
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

  ipcMain.handle('settings:clear-local-data', () => {
    if (queries.getActiveSession()) {
      throw new Error('Stop monitoring before clearing local data.')
    }

    queries.clearLocalData()
    const preferences = getAppPreferences()
    applyOverlayPreferences(preferences)
    broadcastSettingsChanged(preferences)
    broadcastActiveSession()
    return preferences
  })

  ipcMain.handle('app:get-meta', () => {
    return {
      name: app.getName(),
      version: app.getVersion()
    }
  })

  ipcMain.handle(
    'superchat:list',
    (_event, sessionId: string, state?: PaidMessageState, sort?: SortOrder) => {
      return queries.listPaidMessages(sessionId, state, sort)
    }
  )

  ipcMain.handle('superchat:list-saved', (_event, sort?: unknown) => {
    return queries.listSavedArchive(normalizeSortOrder(sort, 'highest'))
  })

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

  ipcMain.handle('superchat:mark-all-read', (_event, sessionId: unknown) => {
    if (typeof sessionId !== 'string' || sessionId.length === 0) return []

    const updatedMessages = queries.markAllMessagesRead(sessionId)
    for (const message of updatedMessages) {
      broadcastSuperchatUpdated(message)
    }
    if (updatedMessages.length > 0) {
      broadcastSessionStats(sessionId)
    }

    return updatedMessages
  })

  ipcMain.handle('superchat:clear-saved', () => {
    const updatedMessages = queries.clearSavedMessages()
    for (const message of updatedMessages) {
      broadcastSuperchatUpdated(message)
    }
    for (const sessionId of new Set(updatedMessages.map((message) => message.sessionId))) {
      broadcastSessionStats(sessionId)
    }

    return updatedMessages
  })

  ipcMain.handle('superchat:export-saved', async (_event, sort?: unknown) => {
    const savedMessages = queries.listSavedArchive(normalizeSortOrder(sort, 'highest'))
    if (savedMessages.length === 0) return null

    const rows = [
      [
        'received_at',
        'session_id',
        'session_title',
        'session_status',
        'donor_display_name',
        'type',
        'amount',
        'currency',
        'converted_amount',
        'converted_currency',
        'state',
        'message'
      ],
      ...savedMessages.map((message) => [
        message.receivedAt,
        message.sessionId,
        message.sessionTitle ?? '',
        message.sessionStatus,
        message.donorDisplayName,
        message.type,
        message.originalAmount,
        message.originalCurrency,
        message.convertedAmount ?? '',
        message.convertedCurrency ?? '',
        message.state,
        message.messageText ?? message.stickerAltText ?? ''
      ])
    ]

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
    const downloadsDir = app.getPath('downloads')
    await mkdir(downloadsDir, { recursive: true })
    const filePath = join(
      downloadsDir,
      `chatcontrol-saved-items-${new Date().toISOString().slice(0, 10)}.csv`
    )
    await writeFile(filePath, csv, 'utf8')

    return filePath
  })

  ipcMain.handle('superchat:copy-text', (_event, messageId: unknown) => {
    const normalizedId = normalizeMessageId(messageId)
    if (!normalizedId) return null

    const message = queries.getPaidMessage(normalizedId)
    const text = message?.messageText
    if (!text) return null

    clipboard.writeText(text)
    return text
  })

  ipcMain.handle('donors:list', (_event, sessionId: string) => {
    return queries.listDonors(sessionId)
  })

  ipcMain.handle('donors:list-all-time', () => {
    return queries.listAllTimeDonors()
  })

  ipcMain.handle('donors:export-leaderboard', async (_event, scopeValue: unknown) => {
    const scope = normalizeLeaderboardScope(scopeValue)
    if (!scope) return null

    const donors =
      scope === 'stream'
        ? (() => {
            const activeSession = queries.getActiveSession()
            if (!activeSession) return null

            return queries.listDonors(activeSession.id).map((donor) => ({
              channelId: donor.channelId,
              displayName: donor.displayName,
              avatarUrl: donor.avatarUrl,
              totalConverted: donor.totalConverted,
              messageCount: donor.messageCount,
              firstSeenAt: donor.firstSeenAt,
              lastSeenAt: donor.lastSeenAt
            }))
          })()
        : queries.listAllTimeDonors()

    if (!donors || donors.length === 0) return null

    const csv = buildLeaderboardCsv(donors, scope)
    if (!csv) return null

    const downloadsDir = app.getPath('downloads')
    await mkdir(downloadsDir, { recursive: true })
    const filePath = join(
      downloadsDir,
      `chatcontrol-leaderboard-${scope === 'stream' ? 'this-stream' : 'all-time'}.csv`
    )
    await writeFile(filePath, csv, 'utf8')

    return filePath
  })

  ipcMain.handle('sessions:list', () => {
    return queries.listSessions()
  })

  ipcMain.handle('sessions:summary', (_event, sessionId: string) => {
    return queries.getSessionSummary(sessionId)
  })

  ipcMain.handle('sessions:report', (_event, sessionId: string) => {
    return queries.getSessionReport(sessionId)
  })

  ipcMain.handle('sessions:export-csv', async (_event, sessionId: unknown) => {
    if (typeof sessionId !== 'string' || sessionId.length === 0) return null

    const session = queries.getSession(sessionId)
    if (!session) return null

    const messages = queries.listPaidMessages(sessionId, undefined, 'latest')
    const rows = [
      [
        'received_at',
        'donor_display_name',
        'type',
        'amount',
        'currency',
        'converted_amount',
        'converted_currency',
        'state',
        'message'
      ],
      ...messages.map((message) => [
        message.receivedAt,
        message.donorDisplayName,
        message.type,
        message.originalAmount,
        message.originalCurrency,
        message.convertedAmount ?? '',
        message.convertedCurrency ?? '',
        message.state,
        message.messageText ?? message.stickerAltText ?? ''
      ])
    ]

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
    const downloadsDir = app.getPath('downloads')
    await mkdir(downloadsDir, { recursive: true })
    const fileName = `${sanitizeFileName(session.title ?? 'chatcontrol-session')}-${sessionId.slice(0, 8)}.csv`
    const filePath = join(downloadsDir, fileName)
    await writeFile(filePath, csv, 'utf8')

    return filePath
  })

  ipcMain.handle('sessions:copy-summary', (_event, sessionId: unknown) => {
    if (typeof sessionId !== 'string' || sessionId.length === 0) return null

    const summary = queries.getSessionSummary(sessionId)
    if (!summary) return null

    const donors = queries.listDonors(sessionId)
    const unreadCount = queries.getSessionStats(sessionId).unreadCount
    const text = buildSummaryText(summary, donors, unreadCount)
    clipboard.writeText(text)
    return text
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
