import { useEffect } from 'react'
import { AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'
import { useSettingsStore } from '../../store/settings'
import { useAuthStore } from '../../store/auth'
import { useStreamStore } from '../../store/stream'
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

const SORT_OPTIONS: { value: SortOrder; label: string; hint: string }[] = [
  { value: 'latest', label: 'Latest First', hint: 'Newest paid messages stay at the top' },
  { value: 'oldest', label: 'Oldest First', hint: 'Review streams in chronological order' },
  { value: 'highest', label: 'Highest First', hint: 'Prioritize the biggest contributions first' }
]

const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f7fb] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d12] focus-visible:shadow-[0_0_0_4px_rgba(225,29,46,0.28)]'

const cardClass =
  'rounded-[20px] border border-[#212b38] bg-[linear-gradient(180deg,rgba(19,25,34,0.98)_0%,rgba(16,21,29,0.98)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.28)]'

const insetRowClass =
  'rounded-[14px] border border-[#1a2431] bg-[#161d27] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'

export function SettingsPanel(): React.JSX.Element {
  const preferences = useSettingsStore((state) => state.preferences)
  const appMeta = useSettingsStore((state) => state.appMeta)
  const loading = useSettingsStore((state) => state.loading)
  const appMetaLoading = useSettingsStore((state) => state.appMetaLoading)
  const error = useSettingsStore((state) => state.error)
  const saving = useSettingsStore((state) => state.saving)
  const clearingData = useSettingsStore((state) => state.clearingData)
  const clearDataConfirmOpen = useSettingsStore((state) => state.clearDataConfirmOpen)
  const fetchAppMeta = useSettingsStore((state) => state.fetchAppMeta)
  const updatePreferences = useSettingsStore((state) => state.updatePreferences)
  const clearLocalData = useSettingsStore((state) => state.clearLocalData)
  const setError = useSettingsStore((state) => state.setError)
  const setClearDataConfirmOpen = useSettingsStore((state) => state.setClearDataConfirmOpen)

  const authStatus = useAuthStore((state) => state.status)
  const authLoading = useAuthStore((state) => state.loading)
  const authError = useAuthStore((state) => state.error)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)

  const activeSession = useStreamStore((state) => state.activeSession)

  useEffect(() => {
    if (!appMeta && !appMetaLoading) {
      void fetchAppMeta()
    }
  }, [appMeta, appMetaLoading, fetchAppMeta])

  const handlePreferenceUpdate = async (patch: Partial<typeof preferences>): Promise<void> => {
    try {
      await updatePreferences(patch)
    } catch {
      // Store-level error state is surfaced in the panel.
    }
  }

  const handleDesktopNotificationsToggle = async (nextValue: boolean): Promise<void> => {
    if (!nextValue) {
      await handlePreferenceUpdate({ desktopNotificationsEnabled: false })
      return
    }

    if (typeof Notification === 'undefined') {
      setError('Desktop notifications are unavailable in this environment.')
      return
    }

    if (Notification.permission === 'denied') {
      setError('Desktop notifications are blocked. Update your system permission settings to re-enable them.')
      return
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Desktop notification permission was not granted.')
        return
      }
    }

    await handlePreferenceUpdate({ desktopNotificationsEnabled: true })
  }

  const handleSwitchAccount = async (): Promise<void> => {
    setError(null)
    if (authStatus.authenticated) {
      await logout()
    }
    await login()
  }

  const handleDisconnect = async (): Promise<void> => {
    setError(null)
    await logout()
  }

  const handleClearData = async (): Promise<void> => {
    if (!clearDataConfirmOpen) {
      setClearDataConfirmOpen(true)
      return
    }

    try {
      await clearLocalData()
    } catch {
      // Store-level error state is surfaced in the panel.
    }
  }

  const accountState = getAccountState({
    authenticated: authStatus.authenticated,
    oauthConfigured: authStatus.oauthConfigured,
    configurationError: authStatus.configurationError,
    displayName: authStatus.displayName,
    avatarUrl: authStatus.avatarUrl,
    authError
  })

  const clearDataDisabled = Boolean(activeSession) || clearingData

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[2.4rem] font-semibold tracking-[-0.05em] text-[#f4f7fb]">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-[#7f8c9d]">
          Configure ChatControl to match your workflow
        </p>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-[16px] border border-[#59242a] bg-[#221217] px-4 py-3 text-sm text-[#ffb6bf] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff6d7b]" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <SettingsSection title="Display" accentClass="bg-[#ff3143]">
            {loading ? (
              <CardSkeleton rows={2} />
            ) : (
              <>
                <SelectField
                  label="Preferred Currency"
                  description="Display donation amounts in your local currency"
                  value={preferences.preferredCurrency}
                  options={CURRENCY_OPTIONS.map((currency) => ({
                    value: currency,
                    label: currency,
                    helper: currency === 'USD' ? 'US Dollar ($)' : undefined
                  }))}
                  onChange={(value) => void handlePreferenceUpdate({ preferredCurrency: value })}
                  disabled={Boolean(saving.preferredCurrency)}
                  saving={Boolean(saving.preferredCurrency)}
                />

                <div className="mt-5">
                  <SelectField
                    label="Default Sort Order"
                    description="How to sort incoming Super Chats"
                    value={preferences.defaultSort}
                    options={SORT_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                      helper: option.hint
                    }))}
                    onChange={(value) =>
                      void handlePreferenceUpdate({ defaultSort: value as SortOrder })
                    }
                    disabled={Boolean(saving.defaultSort)}
                    saving={Boolean(saving.defaultSort)}
                  />
                </div>
              </>
            )}
          </SettingsSection>

          <SettingsSection title="Notifications" accentClass="bg-[#4f99ff]">
            {loading ? (
              <CardSkeleton rows={2} />
            ) : (
              <div className="space-y-3">
                <ToggleRow
                  title="Sound Alerts"
                  description="Play a sound when new Super Chat arrives"
                  checked={preferences.soundEnabled}
                  disabled={Boolean(saving.soundEnabled)}
                  saving={Boolean(saving.soundEnabled)}
                  onChange={(value) => void handlePreferenceUpdate({ soundEnabled: value })}
                />
                <ToggleRow
                  title="Desktop Notifications"
                  description="Show system notifications for high-value donations"
                  checked={preferences.desktopNotificationsEnabled}
                  disabled={Boolean(saving.desktopNotificationsEnabled)}
                  saving={Boolean(saving.desktopNotificationsEnabled)}
                  onChange={(value) => void handleDesktopNotificationsToggle(value)}
                />
              </div>
            )}
          </SettingsSection>

          <SettingsSection title="About" accentClass="bg-[#d7dde7]">
            <div className="flex items-center gap-4">
              <BrandTile />
              <div className="min-w-0">
                <p className="font-display text-[1.05rem] font-semibold tracking-[-0.03em] text-[#f4f7fb]">
                  {appMeta?.name ?? 'ChatControl'} v{appMeta?.version ?? '...'}
                </p>
                <p className="mt-1 text-[12px] text-[#7f8c9d]">
                  Premium YouTube livestream command center for creators and stream operators
                </p>
                {appMetaLoading && (
                  <p className="mt-2 text-[11px] text-[#677486]">Checking version metadata...</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-5 text-[13px]">
              <InlineActionButton disabled>Check for Updates</InlineActionButton>
              <InlineActionButton disabled>Release Notes</InlineActionButton>
            </div>
          </SettingsSection>
        </div>

        <div className="space-y-5">
          <SettingsSection title="Overlay" accentClass="bg-[#f3c546]">
            {loading ? (
              <CardSkeleton rows={4} />
            ) : (
              <>
                <div className="space-y-3">
                  <ToggleRow
                    title="Always on Top"
                    description="Keep overlay visible above all other windows"
                    checked={preferences.overlayAlwaysOnTop}
                    disabled={Boolean(saving.overlayAlwaysOnTop)}
                    saving={Boolean(saving.overlayAlwaysOnTop)}
                    onChange={(value) => void handlePreferenceUpdate({ overlayAlwaysOnTop: value })}
                  />
                  <ToggleRow
                    title="Lock Position"
                    description="Prevent accidental dragging of the overlay"
                    checked={preferences.overlayLocked}
                    disabled={Boolean(saving.overlayLocked)}
                    saving={Boolean(saving.overlayLocked)}
                    onChange={(value) => void handlePreferenceUpdate({ overlayLocked: value })}
                  />
                  <ToggleRow
                    title="Compact Mode"
                    description="Reduce overlay size for smaller screens"
                    checked={preferences.compactMode}
                    disabled={Boolean(saving.compactMode)}
                    saving={Boolean(saving.compactMode)}
                    onChange={(value) => void handlePreferenceUpdate({ compactMode: value })}
                  />
                </div>

                <div className="mt-5">
                  <RangeField
                    label="Overlay Opacity"
                    value={preferences.overlayOpacity}
                    disabled={Boolean(saving.overlayOpacity)}
                    saving={Boolean(saving.overlayOpacity)}
                    onChange={(value) => void handlePreferenceUpdate({ overlayOpacity: value })}
                  />
                </div>
              </>
            )}
          </SettingsSection>

          <SettingsSection title="Connected Account" accentClass="bg-[#23cfaa]">
            <div className={`${insetRowClass} flex items-center gap-4`}>
              <AccountAvatar name={accountState.title} avatarUrl={accountState.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-[#f4f7fb]">
                  {authLoading ? 'Checking account...' : accountState.title}
                </p>
                <p className={`mt-1 text-[12px] ${accountState.statusClass}`}>
                  {authLoading ? 'Resolving YouTube account status' : accountState.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSwitchAccount()}
                disabled={authLoading || !authStatus.oauthConfigured}
                className={`inline-flex h-10 items-center justify-center rounded-[11px] border border-[#293546] bg-[#171f29] px-5 text-[13px] font-medium text-[#c4cfdb] transition-colors hover:border-[#324157] hover:bg-[#1a2330] disabled:cursor-not-allowed disabled:border-[#222c39] disabled:text-[#667283] ${focusRingClass}`}
              >
                {authStatus.authenticated ? 'Switch' : 'Connect'}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-5 text-[13px]">
              <InlineActionButton
                destructive
                disabled={!authStatus.authenticated || authLoading}
                onClick={() => void handleDisconnect()}
              >
                Disconnect Account
              </InlineActionButton>
              <InlineActionButton disabled>Manage Permissions</InlineActionButton>
            </div>
          </SettingsSection>

          <section className="rounded-[20px] border border-[#5b1821] bg-[linear-gradient(180deg,rgba(32,12,17,0.96)_0%,rgba(23,10,14,0.96)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.28)]">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-7 w-1 rounded-full bg-[#ff3143]" />
              <h2 className="font-display text-[1.55rem] font-semibold tracking-[-0.035em] text-[#ff4659]">
                Danger Zone
              </h2>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-[28rem]">
                <p className="text-[1rem] font-semibold text-[#f3d7da]">Clear All Data</p>
                <p className="mt-1 text-[12px] text-[#8f6f75]">
                  Permanently delete all session history, saved items, and local preferences.
                </p>
                {activeSession && (
                  <p className="mt-2 text-[12px] text-[#ff8c97]">
                    Stop active monitoring before clearing local data.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {clearDataConfirmOpen && !clearDataDisabled && (
                  <button
                    type="button"
                    onClick={() => setClearDataConfirmOpen(false)}
                    className={`text-[12px] font-medium text-[#9faab9] transition-colors hover:text-[#f3f6fa] ${focusRingClass}`}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleClearData()}
                  disabled={clearDataDisabled}
                  className={`inline-flex h-11 min-w-[134px] items-center justify-center rounded-[12px] border border-[#9f1f2c] px-5 text-[13px] font-semibold transition-colors ${
                    clearDataConfirmOpen
                      ? 'bg-[#e11d2e] text-[#fff4f5] hover:bg-[#f03a49]'
                      : 'bg-transparent text-[#ff4659] hover:bg-[#2d1218]'
                  } disabled:cursor-not-allowed disabled:border-[#4a2329] disabled:text-[#6f4c52] ${focusRingClass}`}
                >
                  {clearingData ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Clearing...
                    </span>
                  ) : clearDataConfirmOpen ? (
                    'Confirm Clear'
                  ) : (
                    'Clear Data'
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({
  title,
  accentClass,
  children
}: {
  title: string
  accentClass: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className={cardClass}>
      <div className="mb-5 flex items-center gap-3">
        <span className={`h-7 w-1 rounded-full ${accentClass}`} />
        <h2 className="font-display text-[1.55rem] font-semibold tracking-[-0.035em] text-[#f4f7fb]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function SelectField({
  label,
  description,
  value,
  options,
  onChange,
  disabled,
  saving
}: {
  label: string
  description: string
  value: string
  options: Array<{ value: string; label: string; helper?: string }>
  onChange: (value: string) => void
  disabled: boolean
  saving: boolean
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="text-[14px] font-semibold text-[#eef2f7]">{label}</span>
      <span className="mt-1 block text-[11px] text-[#6f7d8e]">{description}</span>
      <div className="relative mt-3">
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`h-12 w-full appearance-none rounded-[12px] border border-[#263243] bg-[#161d27] px-4 pr-12 text-[15px] font-medium text-[#eef2f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors hover:border-[#314056] disabled:cursor-not-allowed disabled:border-[#212a36] disabled:text-[#7b8798] ${focusRingClass}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.helper ? `  ${option.helper}` : ''}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center gap-2 text-[#8793a4]">
          {saving && <Loader2 className="h-4 w-4 animate-spin text-[#ff5d6d]" />}
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </label>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  saving,
  onChange
}: {
  title: string
  description: string
  checked: boolean
  disabled: boolean
  saving: boolean
  onChange: (value: boolean) => void
}): React.JSX.Element {
  return (
    <div className={`${insetRowClass} flex items-center justify-between gap-4`}>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[#eef2f7]">{title}</p>
        <p className="mt-1 text-[11px] text-[#6f7d8e]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-[46px] shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? 'border-[#30d3ad] bg-[#20c99f]'
            : 'border-[#222c39] bg-[#202733]'
        } disabled:cursor-not-allowed disabled:opacity-60 ${focusRingClass}`}
      >
        {saving && (
          <Loader2 className="absolute left-[-24px] h-3.5 w-3.5 animate-spin text-[#ff6676]" />
        )}
        <span
          className={`absolute h-6 w-6 rounded-full bg-[#f4f7fb] shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  )
}

function RangeField({
  label,
  value,
  disabled,
  saving,
  onChange
}: {
  label: string
  value: number
  disabled: boolean
  saving: boolean
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-[15px] font-semibold text-[#eef2f7]">{label}</span>
        <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#e8edf5]">
          {saving && <Loader2 className="h-4 w-4 animate-spin text-[#ff6676]" />}
          {value}%
        </span>
      </div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-[#232d39]" />
        <div
          className="absolute left-0 top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-[#ff3143]"
          style={{ width: `${value}%` }}
        />
        <input
          aria-label={label}
          type="range"
          min={40}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed ${focusRingClass}`}
        />
      </div>
    </div>
  )
}

function InlineActionButton({
  children,
  onClick,
  disabled = false,
  destructive = false
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`text-[13px] font-semibold transition-colors ${
        destructive
          ? 'text-[#ff4b5d] hover:text-[#ff6c7a]'
          : 'text-[#4c98ff] hover:text-[#77adff]'
      } disabled:cursor-not-allowed disabled:text-[#667283] ${focusRingClass}`}
    >
      {children}
    </button>
  )
}

function CardSkeleton({ rows }: { rows: number }): React.JSX.Element {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={`${insetRowClass} h-[74px] animate-pulse bg-[#151d27]`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function BrandTile(): React.JSX.Element {
  return (
    <div className="flex h-[58px] w-[58px] items-center justify-center rounded-[6px] bg-[#f4f6f8] shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-9 w-9">
        <path
          d="M16 3.5 25.95 9v11L16 26.5 6.05 20V9Z"
          fill="#E11D2E"
          stroke="#F7FAFC"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M16 8.2 21.8 11.5v6.9L16 21.8l-5.8-3.4v-6.9Z"
          fill="#FFF8F8"
          stroke="#0A0D12"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path d="m14 11.8 5.2 4.2-5.2 4.2Z" fill="#0A0D12" />
      </svg>
    </div>
  )
}

function AccountAvatar({
  name,
  avatarUrl
}: {
  name: string
  avatarUrl?: string
}): React.JSX.Element {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full border border-white/10 object-cover"
      />
    )
  }

  const initial = name.trim().charAt(0).toUpperCase() || 'C'

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ff2438] text-[1rem] font-semibold text-white shadow-[0_10px_20px_rgba(225,29,46,0.28)]">
      {initial}
    </div>
  )
}

function getAccountState({
  authenticated,
  oauthConfigured,
  configurationError,
  displayName,
  avatarUrl,
  authError
}: {
  authenticated: boolean
  oauthConfigured: boolean
  configurationError?: string
  displayName?: string
  avatarUrl?: string
  authError: string | null
}): {
  title: string
  status: string
  statusClass: string
  avatarUrl?: string
} {
  if (authenticated) {
    return {
      title: displayName ?? 'Connected creator',
      status: 'Connected via YouTube OAuth',
      statusClass: 'text-[#23cfaa]',
      avatarUrl
    }
  }

  if (!oauthConfigured) {
    return {
      title: 'OAuth configuration required',
      status:
        configurationError ??
        'Add Google OAuth credentials before connecting a YouTube channel.',
      statusClass: 'text-[#ff8c97]'
    }
  }

  if (authError) {
    return {
      title: 'Connection needs attention',
      status: authError,
      statusClass: 'text-[#ffb36a]'
    }
  }

  return {
    title: 'No channel connected',
    status: 'Connect a YouTube account to manage livestream monitoring.',
    statusClass: 'text-[#7f8c9d]'
  }
}
