import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { AppPreferences } from '../../shared/ipc-types'
import { getAppPreferences } from '../services/preferences'

let overlayWindow: BrowserWindow | null = null

export function createOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show()
    return overlayWindow
  }

  const display = screen.getPrimaryDisplay()
  const { width: screenWidth } = display.workAreaSize

  overlayWindow = new BrowserWindow({
    width: 380,
    height: 600,
    minWidth: 320,
    minHeight: 400,
    x: screenWidth - 400,
    y: 80,
    show: false,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    backgroundColor: '#09090b',
    hasShadow: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  overlayWindow.on('ready-to-show', () => {
    overlayWindow?.show()
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  const hash = '#/overlay'
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${hash}`)
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }

  applyOverlayPreferences(getAppPreferences())

  return overlayWindow
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow : null
}

export function toggleOverlayWindow(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow()
    return
  }

  if (overlayWindow.isVisible()) {
    overlayWindow.hide()
  } else {
    overlayWindow.show()
  }
}

export function setOverlayLocked(locked: boolean): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.setMovable(!locked)
  overlayWindow.setResizable(!locked)
}

export function setOverlayAlwaysOnTop(enabled: boolean): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.setAlwaysOnTop(enabled)
}

export function applyOverlayPreferences(preferences: AppPreferences): void {
  setOverlayAlwaysOnTop(preferences.overlayAlwaysOnTop)
  setOverlayLocked(preferences.overlayLocked)
}
