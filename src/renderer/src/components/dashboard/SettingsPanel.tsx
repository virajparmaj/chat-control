import { useSettingsStore } from '../../store/settings'
import type { SortOrder } from '../../../../shared/ipc-types'

const CURRENCY_OPTIONS = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'INR',
  'BRL',
  'KRW',
  'MXN',
  'PHP',
  'THB',
  'TWD',
  'SGD',
  'HKD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'NZD',
  'ZAR',
  'RUB',
  'TRY',
  'PLN'
]

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'latest', label: 'Latest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest first' }
]

export function SettingsPanel(): React.JSX.Element {
  const preferences = useSettingsStore((state) => state.preferences)
  const updatePreferences = useSettingsStore((state) => state.updatePreferences)

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">Configure your ChatControl preferences.</p>

      <div className="space-y-6">
        <SettingsSection
          title="Currency"
          description="Display new sessions and dashboards in your preferred converted currency."
        >
          <select
            value={preferences.preferredCurrency}
            onChange={(event) => void updatePreferences({ preferredCurrency: event.target.value })}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CURRENCY_OPTIONS.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </SettingsSection>

        <SettingsSection
          title="Default Sort"
          description="Choose how restored sessions and the overlay inbox are sorted by default."
        >
          <select
            value={preferences.defaultSort}
            onChange={(event) =>
              void updatePreferences({ defaultSort: event.target.value as SortOrder })
            }
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingsSection>

        <SettingsSection
          title="Sound Alerts"
          description="Play a system alert when a new paid message arrives."
        >
          <Toggle
            enabled={preferences.soundEnabled}
            onChange={(value) => void updatePreferences({ soundEnabled: value })}
          />
        </SettingsSection>

        <SettingsSection
          title="Compact Mode"
          description="Reduce card spacing in the overlay feed."
        >
          <Toggle
            enabled={preferences.compactMode}
            onChange={(value) => void updatePreferences({ compactMode: value })}
          />
        </SettingsSection>

        <SettingsSection
          title="Always on Top"
          description="Keep the overlay above other desktop apps."
        >
          <Toggle
            enabled={preferences.overlayAlwaysOnTop}
            onChange={(value) => void updatePreferences({ overlayAlwaysOnTop: value })}
          />
        </SettingsSection>

        <SettingsSection
          title="Lock Overlay"
          description="Prevent the overlay window from being moved or resized."
        >
          <Toggle
            enabled={preferences.overlayLocked}
            onChange={(value) => void updatePreferences({ overlayLocked: value })}
          />
        </SettingsSection>
      </div>
    </div>
  )
}

function SettingsSection({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="w-40 shrink-0">{children}</div>
      </div>
    </div>
  )
}

function Toggle({
  enabled,
  onChange
}: {
  enabled: boolean
  onChange: (value: boolean) => void
}): React.JSX.Element {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative h-5 w-10 rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-secondary'
      }`}
    >
      <div
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
