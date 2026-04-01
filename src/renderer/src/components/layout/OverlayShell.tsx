import { Lock, PinOff, Sparkles } from 'lucide-react'
import { OverlayFeed } from '../overlay/OverlayFeed'
import { SummaryStrip } from '../overlay/SummaryStrip'
import { UndoSnackbar } from '../overlay/UndoSnackbar'
import { useSuperchatStore } from '../../store/superchats'
import { useStreamStore } from '../../store/stream'
import { useSettingsStore } from '../../store/settings'
import { useRuntimeSync } from '../../hooks/useRuntimeSync'
import { LogoMark } from '../shared/LogoMark'
import type { StreamStatusEvent } from '../../../../shared/ipc-types'

export function OverlayShell(): React.JSX.Element {
  useRuntimeSync()

  const messages = useSuperchatStore((state) => state.messages)
  const sort = useSuperchatStore((state) => state.sort)
  const stats = useSuperchatStore((state) => state.stats)
  const undoEntry = useSuperchatStore((state) => state.undoEntry)
  const messagesLoading = useSuperchatStore((state) => state.loading)
  const markRead = useSuperchatStore((state) => state.markRead)
  const save = useSuperchatStore((state) => state.save)
  const undo = useSuperchatStore((state) => state.undo)
  const setSort = useSuperchatStore((state) => state.setSort)

  const activeSession = useStreamStore((state) => state.activeSession)
  const streamStatus = useStreamStore((state) => state.streamStatus)
  const streamError = useStreamStore((state) => state.error)

  const preferences = useSettingsStore((state) => state.preferences)
  const settingsLoading = useSettingsStore((state) => state.loading)
  const updatePreferences = useSettingsStore((state) => state.updatePreferences)

  const statusMeta = getStatusMeta(streamStatus, Boolean(activeSession))
  const displayCurrency =
    activeSession?.convertedCurrency ?? stats.convertedCurrency ?? preferences.preferredCurrency
  const overlayLoading = settingsLoading || messagesLoading

  const handleLock = async (): Promise<void> => {
    await updatePreferences({ overlayLocked: !preferences.overlayLocked })
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-[24px] border border-white/7 bg-[#0d1219] text-[#f3f6fa] shadow-[0_22px_60px_rgba(0,0,0,0.48)]">
      <div className="drag-region shrink-0 border-b border-white/6 bg-[#111821] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="h-8 w-8" />
            <span className="truncate font-display text-[1.1rem] font-semibold tracking-[-0.03em] text-[#f5f7fb]">
              ChatControl
            </span>
          </div>

          <div className="no-drag flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusMeta.className}`}
            >
              <span className={`h-2 w-2 rounded-full ${statusMeta.dotClass}`} />
              <span>{statusMeta.label}</span>
            </div>

            <button
              type="button"
              onClick={() => void handleLock()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/8 bg-[#171f29] text-[#b0bac8] transition-colors hover:border-white/14 hover:text-[#f3f6fa]"
              title={preferences.overlayLocked ? 'Unlock overlay' : 'Lock overlay'}
              aria-label={preferences.overlayLocked ? 'Unlock overlay' : 'Lock overlay'}
            >
              {preferences.overlayLocked ? (
                <Lock className="h-4 w-4 text-[#f3f6fa]" />
              ) : (
                <PinOff className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Additional overlay utilities coming soon"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/8 bg-[#171f29] text-[#7f8b9d]"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <SummaryStrip
        total={stats.totalConverted}
        currency={displayCurrency}
        unreadCount={stats.unreadCount}
        savedCount={stats.savedCount}
        sort={sort}
        onSortChange={setSort}
      />

      <div className="relative flex-1 overflow-y-auto bg-[#0d1219] px-3 pb-3 pt-3">
        <OverlayFeed
          messages={messages}
          onMarkRead={markRead}
          onSave={save}
          compact={preferences.compactMode}
          hasActiveSession={Boolean(activeSession)}
          loading={overlayLoading}
          errorMessage={streamError}
        />
        <UndoSnackbar visible={undoEntry !== null} onUndo={undo} />
      </div>
    </div>
  )
}

function getStatusMeta(
  status: StreamStatusEvent | null,
  hasActiveSession: boolean
): { label: string; className: string; dotClass: string } {
  if (!status) {
    return {
      label: hasActiveSession ? 'Live' : 'Offline',
      className: hasActiveSession
        ? 'border border-[#174c3f] bg-[#11352d] text-[#35d497]'
        : 'border border-white/7 bg-[#171f29] text-[#95a1b2]',
      dotClass: hasActiveSession ? 'bg-[#20d892]' : 'bg-[#738093]'
    }
  }

  switch (status.type) {
    case 'connected':
    case 'polling':
      return {
        label: 'Live',
        className: 'border border-[#174c3f] bg-[#11352d] text-[#35d497]',
        dotClass: 'bg-[#20d892]'
      }
    case 'reconnecting':
      return {
        label: 'Syncing',
        className: 'border border-[#5a4620] bg-[#2b2412] text-[#f6c35f]',
        dotClass: 'bg-[#f2c358]'
      }
    case 'error':
      return {
        label: 'Error',
        className: 'border border-[#6a232d] bg-[#32161b] text-[#ff6c7d]',
        dotClass: 'bg-[#ff6c7d]'
      }
    case 'ended':
      return {
        label: 'Ended',
        className: 'border border-white/7 bg-[#171f29] text-[#95a1b2]',
        dotClass: 'bg-[#738093]'
      }
    default:
      return {
        label: hasActiveSession ? 'Live' : 'Offline',
        className: hasActiveSession
          ? 'border border-[#174c3f] bg-[#11352d] text-[#35d497]'
          : 'border border-white/7 bg-[#171f29] text-[#95a1b2]',
        dotClass: hasActiveSession ? 'bg-[#20d892]' : 'bg-[#738093]'
      }
  }
}
