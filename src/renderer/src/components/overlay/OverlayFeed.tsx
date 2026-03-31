import { AnimatePresence } from 'framer-motion'
import { MessageCircle, Radio } from 'lucide-react'
import { SuperChatCard } from './SuperChatCard'
import type { PaidMessage } from '../../../../shared/ipc-types'

interface OverlayFeedProps {
  messages: PaidMessage[]
  onMarkRead: (id: string) => void
  onSave: (id: string) => void
  showRead?: boolean
  compact?: boolean
  hasActiveSession?: boolean
}

export function OverlayFeed({
  messages,
  onMarkRead,
  onSave,
  showRead = false,
  compact = false,
  hasActiveSession = false
}: OverlayFeedProps): React.JSX.Element {
  const filtered = showRead ? messages : messages.filter((message) => message.state === 'unread')

  if (!hasActiveSession) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <Radio className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No active stream</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Start or restore a monitoring session to populate the overlay.
        </p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No Super Chats yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Paid messages will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {filtered.map((message) => (
          <SuperChatCard
            key={message.id}
            message={message}
            onMarkRead={onMarkRead}
            onSave={onSave}
            compact={compact}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
