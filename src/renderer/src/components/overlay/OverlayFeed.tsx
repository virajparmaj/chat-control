import { AnimatePresence } from 'framer-motion'
import { AlertCircle, Loader2, MessageCircle, Radio } from 'lucide-react'
import { SuperChatCard } from './SuperChatCard'
import type { PaidMessage } from '../../../../shared/ipc-types'

interface OverlayFeedProps {
  messages: PaidMessage[]
  onMarkRead: (id: string) => void
  onSave: (id: string) => void
  showRead?: boolean
  compact?: boolean
  hasActiveSession?: boolean
  loading?: boolean
  errorMessage?: string | null
}

export function OverlayFeed({
  messages,
  onMarkRead,
  onSave,
  showRead = true,
  compact = false,
  hasActiveSession = false,
  loading = false,
  errorMessage = null
}: OverlayFeedProps): React.JSX.Element {
  const filtered = showRead ? messages : messages.filter((message) => message.state !== 'read')
  const activeIndex = filtered.findIndex((message) => message.state === 'unread')
  const unreadBelowCount =
    activeIndex >= 0
      ? filtered.slice(activeIndex + 1).filter((message) => message.state === 'unread').length
      : 0

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`animate-pulse rounded-[18px] border border-white/7 bg-[#111821] p-4 ${
              index === 0 ? 'min-h-[138px]' : 'min-h-[92px]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-white/8" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-28 rounded-full bg-white/8" />
                  <div className="h-7 w-20 rounded-[10px] bg-white/8" />
                </div>
                <div className="mt-2 h-3 w-16 rounded-full bg-white/6" />
                <div className="mt-4 h-3 w-full rounded-full bg-white/6" />
                <div className="mt-2 h-3 w-4/5 rounded-full bg-white/6" />
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-center gap-2 pt-2 text-sm text-[#8b98ac]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading overlay inbox</span>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#6c222c] bg-[#301419]">
          <AlertCircle className="h-5 w-5 text-[#ff5b6d]" />
        </div>
        <p className="text-sm font-semibold text-[#f4f7fb]">Overlay connection issue</p>
        <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-[#98a4b3]">{errorMessage}</p>
      </div>
    )
  }

  if (!hasActiveSession) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/7 bg-[#151c26]">
          <Radio className="h-5 w-5 text-[#8e9aae]" />
        </div>
        <p className="text-sm font-semibold text-[#f4f7fb]">No active stream</p>
        <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-[#98a4b3]">
          Start or restore a monitoring session to populate the overlay.
        </p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/7 bg-[#151c26]">
          <MessageCircle className="h-5 w-5 text-[#8e9aae]" />
        </div>
        <p className="text-sm font-semibold text-[#f4f7fb]">No Super Chats yet</p>
        <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-[#98a4b3]">
          Paid messages will appear here once your stream goes live.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {filtered.map((message, index) => (
          <SuperChatCard
            key={message.id}
            message={message}
            onMarkRead={onMarkRead}
            onSave={onSave}
            compact={compact}
            isActive={index === activeIndex}
          />
        ))}
      </AnimatePresence>
      {unreadBelowCount > 0 ? (
        <div className="rounded-[12px] border border-[#44171d] bg-[#261116] px-4 py-3 text-center text-sm font-semibold tracking-[-0.02em] text-[#ff394a]">
          {unreadBelowCount} more unread {unreadBelowCount === 1 ? 'message' : 'messages'} below
        </div>
      ) : null}
    </div>
  )
}
