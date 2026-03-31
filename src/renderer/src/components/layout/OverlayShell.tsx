import { useState } from 'react'
import { ChevronDown, ChevronUp, Grip, Loader2, Pin, PinOff, Wifi, WifiOff } from 'lucide-react'
import { OverlayFeed } from '../overlay/OverlayFeed'
import { SummaryStrip } from '../overlay/SummaryStrip'
import { SortControls } from '../overlay/SortControls'
import { UndoSnackbar } from '../overlay/UndoSnackbar'
import { useSuperchatStore } from '../../store/superchats'
import { useStreamStore } from '../../store/stream'
import { useSettingsStore } from '../../store/settings'
import { useRuntimeSync } from '../../hooks/useRuntimeSync'
import type { StreamStatusEvent } from '../../../../shared/ipc-types'

export function OverlayShell(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  useRuntimeSync()

  const messages = useSuperchatStore((state) => state.messages)
  const sort = useSuperchatStore((state) => state.sort)
  const stats = useSuperchatStore((state) => state.stats)
  const undoEntry = useSuperchatStore((state) => state.undoEntry)
  const markRead = useSuperchatStore((state) => state.markRead)
  const save = useSuperchatStore((state) => state.save)
  const undo = useSuperchatStore((state) => state.undo)
  const setSort = useSuperchatStore((state) => state.setSort)

  const activeSession = useStreamStore((state) => state.activeSession)
  const streamStatus = useStreamStore((state) => state.streamStatus)

  const preferences = useSettingsStore((state) => state.preferences)
  const updatePreferences = useSettingsStore((state) => state.updatePreferences)

  const statusIndicator = getStatusIndicator(streamStatus)
  const displayCurrency =
    activeSession?.convertedCurrency ?? stats.convertedCurrency ?? preferences.preferredCurrency

  const handleLock = async (): Promise<void> => {
    await updatePreferences({ overlayLocked: !preferences.overlayLocked })
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground">
      <div className="drag-region flex shrink-0 items-center justify-between border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <Grip className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wide text-foreground/80">
            ChatControl
          </span>
          {statusIndicator}
        </div>
        <div className="no-drag flex items-center gap-1">
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="rounded p-1 transition-colors hover:bg-secondary"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => void handleLock()}
            className="rounded p-1 transition-colors hover:bg-secondary"
            title={preferences.overlayLocked ? 'Unlock position' : 'Lock position'}
          >
            {preferences.overlayLocked ? (
              <Pin className="h-3.5 w-3.5 text-primary" />
            ) : (
              <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <SummaryStrip
            total={stats.totalConverted}
            currency={displayCurrency}
            unreadCount={stats.unreadCount}
            savedCount={stats.savedCount}
          />

          <div className="relative flex-1 overflow-y-auto px-2 py-2">
            <OverlayFeed
              messages={messages}
              onMarkRead={markRead}
              onSave={save}
              compact={preferences.compactMode}
              hasActiveSession={Boolean(activeSession)}
            />
            <UndoSnackbar visible={undoEntry !== null} onUndo={undo} />
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-3 py-1.5">
            <SortControls current={sort} onChange={setSort} />
          </div>
        </>
      )}
    </div>
  )
}

function getStatusIndicator(status: StreamStatusEvent | null): React.JSX.Element | null {
  if (!status) return null

  switch (status.type) {
    case 'connected':
    case 'polling':
      return <Wifi className="h-3 w-3 text-green-400" />
    case 'reconnecting':
      return <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
    case 'error':
      return <WifiOff className="h-3 w-3 text-red-400" />
    case 'ended':
      return <span className="text-[9px] text-muted-foreground">Ended</span>
    default:
      return null
  }
}
