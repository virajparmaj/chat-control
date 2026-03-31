import { AnimatePresence } from 'framer-motion'
import { Bookmark, Check, Undo2 } from 'lucide-react'
import { useSuperchatStore } from '../../store/superchats'
import { SuperChatCard } from '../overlay/SuperChatCard'

export function SavedItems(): React.JSX.Element {
  const messages = useSuperchatStore((state) => state.messages)
  const markRead = useSuperchatStore((state) => state.markRead)
  const save = useSuperchatStore((state) => state.save)

  const savedMessages = messages.filter((message) => message.state === 'saved')

  const handleMoveToUnread = async (id: string): Promise<void> => {
    await window.api.superchats.undo(id)
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Saved Items</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Super Chats you saved for later review in the current session.
      </p>

      {savedMessages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Bookmark className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No saved items</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Save Super Chats from the overlay or dashboard to review them later.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {savedMessages.map((message) => (
              <div key={message.id} className="relative">
                <SuperChatCard message={message} onMarkRead={markRead} onSave={save} />
                <div className="ml-5 mt-1.5 flex gap-2">
                  <button
                    onClick={() => void markRead(message.id)}
                    className="flex items-center gap-1 text-[10px] text-green-400 transition-colors hover:text-green-300"
                  >
                    <Check className="h-3 w-3" />
                    Mark as Read
                  </button>
                  <button
                    onClick={() => void handleMoveToUnread(message.id)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Undo2 className="h-3 w-3" />
                    Move to Inbox
                  </button>
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
