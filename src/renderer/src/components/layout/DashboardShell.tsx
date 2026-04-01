import { useState, useEffect } from 'react'
import { Radio, BookmarkCheck, Trophy, History, Settings, LogOut, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useStreamStore } from '../../store/stream'
import { StreamInfo } from '../dashboard/StreamInfo'
import { SavedItems } from '../dashboard/SavedItems'
import { DonorLeaderboard } from '../leaderboard/DonorLeaderboard'
import { SessionHistory } from '../dashboard/SessionHistory'
import { SettingsPanel } from '../dashboard/SettingsPanel'
import { StreamSummary } from '../summary/StreamSummary'
import { LogoMark } from '../shared/LogoMark'
import { useRuntimeSync } from '../../hooks/useRuntimeSync'

type DashboardView = 'home' | 'saved' | 'leaderboard' | 'history' | 'settings'

const NAV_ITEMS: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Stream Monitor', icon: <Radio className="w-4 h-4" /> },
  { id: 'saved', label: 'Saved Items', icon: <BookmarkCheck className="w-4 h-4" /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
  { id: 'history', label: 'Session History', icon: <History className="w-4 h-4" /> }
]

export function DashboardShell(): React.JSX.Element {
  const [activeView, setActiveView] = useState<DashboardView>('home')
  const { status, loading: authLoading, checkAuth, logout } = useAuthStore()
  const { sessionSummary, loading: streamLoading, activeSession, streamStatus } = useStreamStore()

  useRuntimeSync()

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  const connectionLabel = status.authenticated
    ? streamLoading
      ? 'Syncing stream health'
      : 'YouTube connected'
    : 'Not connected'
  const isMonitorView = activeView === 'home'
  const isHistoryView = activeView === 'history'
  const monitoringStatus = !activeSession
    ? {
        dotClass: 'bg-[#98a4b3]',
        textClass: 'text-[#9aa6b6]',
        label: 'Monitoring idle',
        detail: status.authenticated
          ? 'Start a live session to begin moderation.'
          : 'Sign in to monitor streams'
      }
    : streamStatus?.type === 'reconnecting'
      ? {
          dotClass: 'bg-[#f6b443]',
          textClass: 'text-[#f6b443]',
          label: 'Reconnecting',
          detail: `Attempt ${streamStatus.attempt} in progress`
        }
      : {
          dotClass: 'bg-[#18b777]',
          textClass: 'text-[#23d18b]',
          label: 'Live - Monitoring',
          detail: activeSession.title ?? 'Current stream is active'
        }
  const shellStatus = !status.authenticated
    ? {
        dotClass: 'bg-[#97a2b1]',
        textClass: 'text-[#97a2b1]',
        label: 'Not monitoring',
        detail: status.oauthConfigured
          ? 'Connect YouTube inside Settings to begin.'
          : 'OAuth setup is required before connecting.'
      }
    : monitoringStatus

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside
        className={`flex shrink-0 flex-col border-r border-white/5 bg-[#0f1319] text-[#f3f6fa] ${
          isMonitorView ? 'w-[205px]' : 'w-[236px]'
        }`}
      >
        <div className="drag-region border-b border-white/6 px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="font-display block text-[1.05rem] font-semibold tracking-[-0.03em]">
              ChatControl
            </span>
          </div>
        </div>

        {!isMonitorView && !isHistoryView && activeView !== 'settings' && status.authenticated && (
          <div className="border-b border-white/6 px-4 py-4">
            <div className="flex items-center gap-3 rounded-[14px] border border-white/6 bg-white/[0.02] px-3 py-2.5">
              {status.avatarUrl && (
                <img
                  src={status.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full border border-white/10"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#f3f6fa]">
                  {status.displayName ?? 'Connected creator'}
                </p>
                <p className="truncate text-xs text-[#7f8c9d]">{status.email ?? connectionLabel}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pt-3">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e7a8b]">
            Monitoring
          </p>
        </div>
        <nav className="flex-1 px-3 pb-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`mb-1 flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm transition-all duration-150 ${
                activeView === item.id
                  ? 'border border-[#6f1d25] bg-[#3b1419] font-medium text-[#fff5f6] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(225,29,46,0.08)]'
                  : 'border border-transparent text-[#9aa6b6] hover:border-white/6 hover:bg-white/[0.03] hover:text-[#f3f6fa]'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <div className="px-2 pb-2 pt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e7a8b]">
              System
            </p>
            <button
              onClick={() => setActiveView('settings')}
              className={`mb-1 flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm transition-all duration-150 ${
                activeView === 'settings'
                  ? 'border border-[#6f1d25] bg-[#3b1419] font-medium text-[#fff5f6] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(225,29,46,0.08)]'
                  : 'border border-transparent text-[#9aa6b6] hover:border-white/6 hover:bg-white/[0.03] hover:text-[#f3f6fa]'
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </nav>

        {isMonitorView || isHistoryView || activeView === 'settings' || !status.authenticated ? (
          <div className="mt-auto border-t border-white/6 px-4 py-4">
            <div className="flex items-center gap-2 px-1 py-1 text-[13px]">
              <span className={`h-2.5 w-2.5 rounded-full ${shellStatus.dotClass}`} />
              <span className={shellStatus.textClass}>{shellStatus.label}</span>
            </div>
            <p className="px-1 pt-1 text-[11px] text-[#667283]">{shellStatus.detail}</p>
          </div>
        ) : (
          <div className="border-t border-white/6 px-4 py-4">
            <div className="flex items-center gap-2 px-1 py-1 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${monitoringStatus.dotClass}`} />
              <span className={`font-medium ${monitoringStatus.textClass}`}>
                {monitoringStatus.label}
              </span>
            </div>
            <button
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-xs text-[#9aa6b6] transition-colors hover:bg-white/[0.03] hover:text-[#f3f6fa]"
            >
              <LogOut className="w-3 h-3" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="relative flex-1 overflow-y-auto bg-[#0a0d12]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e11d2e] to-transparent opacity-80" />
        <div className="mx-auto max-w-[1168px] px-8 py-8">
          {sessionSummary && activeView === 'home' && (
            <div className="mb-6 rounded-[20px] border border-[#4b1d22] bg-[#121821] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <StreamSummary summary={sessionSummary} />
            </div>
          )}

          {activeView === 'home' && <StreamInfo />}
          {activeView === 'saved' && <SavedItems />}
          {activeView === 'leaderboard' && <DonorLeaderboard />}
          {activeView === 'history' && <SessionHistory />}
          {activeView === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  )
}
