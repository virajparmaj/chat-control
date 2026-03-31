import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

let dashboardWindow: BrowserWindow | null = null

export function createDashboardWindow(): BrowserWindow {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.focus()
    return dashboardWindow
  }

  dashboardWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#09090b',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  dashboardWindow.on('ready-to-show', () => {
    dashboardWindow?.show()
  })

  dashboardWindow.on('closed', () => {
    dashboardWindow = null
  })

  dashboardWindow.webContents.setWindowOpenHandler((details) => {
    const isHttps = details.url.startsWith('https://')
    if (isHttps) {
      shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  const hash = '#/dashboard'
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    dashboardWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${hash}`)
  } else {
    dashboardWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }

  return dashboardWindow
}

export function getDashboardWindow(): BrowserWindow | null {
  return dashboardWindow && !dashboardWindow.isDestroyed() ? dashboardWindow : null
}
