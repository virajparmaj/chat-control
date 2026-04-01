import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppPreferences } from '../../shared/ipc-types'
import { DEFAULT_PREFERENCES } from '../../shared/ipc-types'

const browserWindowState = vi.hoisted(() => ({
  instance: {
    isDestroyed: vi.fn(() => false),
    show: vi.fn(),
    hide: vi.fn(),
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    setMovable: vi.fn(),
    setResizable: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    setOpacity: vi.fn(),
    isVisible: vi.fn(() => true)
  }
}))

vi.mock('electron', () => ({
  BrowserWindow: class {
    constructor() {
      return browserWindowState.instance
    }
  },
  screen: {
    getPrimaryDisplay: () => ({
      workAreaSize: { width: 1440, height: 900 }
    })
  }
}))

vi.mock('@electron-toolkit/utils', () => ({
  is: { dev: false }
}))

vi.mock('../services/preferences', () => ({
  getAppPreferences: (): AppPreferences => DEFAULT_PREFERENCES
}))

describe('overlay window preferences', () => {
  beforeEach(() => {
    browserWindowState.instance.isDestroyed.mockReturnValue(false)
    browserWindowState.instance.setMovable.mockReset()
    browserWindowState.instance.setResizable.mockReset()
    browserWindowState.instance.setAlwaysOnTop.mockReset()
    browserWindowState.instance.setOpacity.mockReset()
    browserWindowState.instance.loadFile.mockReset()
    browserWindowState.instance.loadURL.mockReset()
    browserWindowState.instance.on.mockReset()
  })

  it('applies always-on-top, lock, and opacity preferences to the BrowserWindow', async () => {
    const { applyOverlayPreferences, createOverlayWindow } = await import('./overlay')

    createOverlayWindow()
    applyOverlayPreferences({
      ...DEFAULT_PREFERENCES,
      overlayAlwaysOnTop: false,
      overlayLocked: true,
      overlayOpacity: 88
    })

    expect(browserWindowState.instance.setAlwaysOnTop).toHaveBeenCalledWith(false)
    expect(browserWindowState.instance.setMovable).toHaveBeenCalledWith(false)
    expect(browserWindowState.instance.setResizable).toHaveBeenCalledWith(false)
    expect(browserWindowState.instance.setOpacity).toHaveBeenCalledWith(0.88)
  })
})
