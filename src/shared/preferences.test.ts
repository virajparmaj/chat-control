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
        overlayAlwaysOnTop: 'sometimes',
        overlayLocked: 1,
        compactMode: 'tight',
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
        overlayAlwaysOnTop: false,
        overlayLocked: true,
        compactMode: true
      })
    ).toEqual({
      preferredCurrency: 'EUR',
      defaultSort: 'highest',
      soundEnabled: true,
      overlayAlwaysOnTop: false,
      overlayLocked: true,
      compactMode: true,
      theme: 'dark'
    })
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
