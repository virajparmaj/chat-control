import { ipcMain } from 'electron'
import { login, logout, getValidAccessToken, getOAuthConfigurationStatus } from '../services/oauth'
import { stopMonitoringSession } from '../services/session-manager'
import { getChannelInfo } from '../services/youtube-api'
import type { AuthStatus } from '../../shared/ipc-types'

function createSignedOutStatus(configuration: {
  oauthConfigured: boolean
  configurationError?: string
}): AuthStatus {
  return {
    authenticated: false,
    oauthConfigured: configuration.oauthConfigured,
    configurationError: configuration.configurationError
  }
}

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:login', async (): Promise<AuthStatus> => {
    const configuration = getOAuthConfigurationStatus()

    try {
      await login()
      const channel = await getChannelInfo()
      return {
        authenticated: true,
        oauthConfigured: true,
        channelId: channel?.channelId,
        displayName: channel?.displayName,
        avatarUrl: channel?.avatarUrl
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : configuration.configurationError ?? 'Login failed'
      throw new Error(message)
    }
  })

  ipcMain.handle('auth:logout', async (): Promise<void> => {
    await stopMonitoringSession()
    logout()
  })

  ipcMain.handle('auth:status', async (): Promise<AuthStatus> => {
    const configuration = getOAuthConfigurationStatus()
    const token = await getValidAccessToken()

    if (!token) {
      return createSignedOutStatus(configuration)
    }

    try {
      const channel = await getChannelInfo()
      return {
        authenticated: true,
        oauthConfigured: configuration.oauthConfigured,
        configurationError: configuration.configurationError,
        channelId: channel?.channelId,
        displayName: channel?.displayName,
        avatarUrl: channel?.avatarUrl
      }
    } catch {
      return createSignedOutStatus(configuration)
    }
  })
}
