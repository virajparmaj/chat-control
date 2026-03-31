import { useState, useEffect } from 'react'
import {
  Radio,
  BookmarkCheck,
  Trophy,
  History,
  Settings,
  MonitorPlay,
  Layers,
  LogOut,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useStreamStore } from '../../store/stream'
import { LoginScreen } from '../../features/auth/LoginScreen'
import { StreamInfo } from '../dashboard/StreamInfo'
import { SavedItems } from '../dashboard/SavedItems'
import { DonorLeaderboard } from '../leaderboard/DonorLeaderboard'
import { SessionHistory } from '../dashboard/SessionHistory'
import { SettingsPanel } from '../dashboard/SettingsPanel'
import { StreamSummary } from '../summary/StreamSummary'
import { useRuntimeSync } from '../../hooks/useRuntimeSync'

type DashboardView = 'home' | 'saved' | 'leaderboard' | 'history' | 'settings'

const NAV_ITEMS: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Stream', icon: <Radio className="w-4 h-4" /> },
  { id: 'saved', label: 'Saved', icon: <BookmarkCheck className="w-4 h-4" /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
]

export function DashboardShell(): React.JSX.Element {
  const [activeView, setActiveView] = useState<DashboardView>('home')
  const { status, loading: authLoading, checkAuth, logout } = useAuthStore()
  const { sessionSummary } = useStreamStore()

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

  if (!status.authenticated) {
    return <LoginScreen />
  }

  const handleOverlayToggle = async (): Promise<void> => {
    await window.api.window.toggleOverlay()
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-56 border-r border-border bg-card flex flex-col shrink-0">
        <div className="drag-region px-4 pt-8 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-sm tracking-tight">ChatControl</span>
          </div>
        </div>

        <div className="px-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            {status.avatarUrl && (
              <img src={status.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
            )}
            <span className="text-xs text-muted-foreground truncate">
              {status.displayName ?? 'Connected'}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === item.id
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 space-y-2 border-t border-border">
          <button
            onClick={handleOverlayToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <MonitorPlay className="w-4 h-4" />
            Toggle Overlay
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {sessionSummary && activeView === 'home' && (
            <div className="mb-6 rounded-xl border border-primary/20 bg-card p-6">
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
