import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES } from './ipc-types'
import { mergePreferences, sanitizePreferences } from './preferences'

describe('sanitizePreferences', () => {
  it('falls back to defaults for invalid input', () => {
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(
      sanitizePreferences({
        preferredCurrency: '',
        defaultSort: 'sideways',
        soundEnabled: 'yes',
        desktopNotificationsEnabled: 'sometimes',
        overlayAlwaysOnTop: 'sometimes',
        overlayLocked: 1,
        compactMode: 'tight',
        overlayOpacity: 'opaque',
        theme: 'light'
      })
    ).toEqual(DEFAULT_PREFERENCES)
  })

  it('normalizes valid values', () => {
    expect(
      sanitizePreferences({
        preferredCurrency: 'eur',
        defaultSort: 'highest',
        soundEnabled: true,
        desktopNotificationsEnabled: false,
        overlayAlwaysOnTop: false,
        overlayLocked: true,
        compactMode: true,
        overlayOpacity: 72.8
      })
    ).toEqual({
      preferredCurrency: 'EUR',
      defaultSort: 'highest',
      soundEnabled: true,
      desktopNotificationsEnabled: false,
      overlayAlwaysOnTop: false,
      overlayLocked: true,
      compactMode: true,
      overlayOpacity: 73,
      theme: 'dark'
    })
  })

  it('clamps overlay opacity into the supported range', () => {
    expect(sanitizePreferences({ overlayOpacity: 5 }).overlayOpacity).toBe(40)
    expect(sanitizePreferences({ overlayOpacity: 101 }).overlayOpacity).toBe(100)
  })
})

describe('mergePreferences', () => {
  it('merges a partial patch without dropping existing values', () => {
    expect(
      mergePreferences(
        {
          ...DEFAULT_PREFERENCES,
          preferredCurrency: 'GBP',
          compactMode: true
        },
        {
          defaultSort: 'oldest',
          overlayAlwaysOnTop: false
        }
      )
    ).toEqual({
      ...DEFAULT_PREFERENCES,
      preferredCurrency: 'GBP',
      compactMode: true,
      defaultSort: 'oldest',
      overlayAlwaysOnTop: false
    })
  })
})
