import { Check, Bookmark, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { getTierConfig } from '../../lib/tiers'
import { formatCurrency } from '../../lib/currency'
import type { PaidMessage } from '../../../../shared/ipc-types'

interface SuperChatCardProps {
  message: PaidMessage
  onMarkRead: (id: string) => void
  onSave: (id: string) => void
  compact?: boolean
}

export function SuperChatCard({
  message,
  onMarkRead,
  onSave,
  compact = false
}: SuperChatCardProps): React.JSX.Element {
  const tier = getTierConfig(message.tier)
  const isSticker = message.type === 'super_sticker'

  const timeAgo = getTimeAgo(message.receivedAt)
  const originalDisplay =
    message.amountDisplayString ?? formatCurrency(message.originalAmount, message.originalCurrency)
  const convertedDisplay =
    message.convertedAmount !== null && message.convertedCurrency
      ? formatCurrency(message.convertedAmount, message.convertedCurrency)
      : null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`group relative rounded-lg border ${tier.border} ${tier.bg} p-3 transition-colors`}
    >
      {/* Tier accent bar */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
        style={{
          backgroundColor: getTierConfig(message.tier).text.replace('text-[', '').replace(']', '')
        }}
      />

      <div className="flex items-start gap-2.5 ml-2">
        {/* Avatar */}
        {message.donorAvatarUrl && !compact && (
          <img
            src={message.donorAvatarUrl}
            alt=""
            className="w-7 h-7 rounded-full shrink-0 mt-0.5"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground truncate">
              {message.donorDisplayName}
            </span>
            {isSticker && <Sparkles className="w-3 h-3 text-yellow-400 shrink-0" />}
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{timeAgo}</span>
          </div>

          {/* Amount */}
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className={`text-sm font-bold ${tier.text}`}>{originalDisplay}</span>
            {convertedDisplay && convertedDisplay !== originalDisplay && (
              <span className="text-[10px] text-muted-foreground">({convertedDisplay})</span>
            )}
          </div>

          {/* Message */}
          {message.messageText && (
            <p className="text-xs text-foreground/80 mt-1 leading-relaxed line-clamp-3">
              {message.messageText}
            </p>
          )}

          {/* Sticker alt text */}
          {isSticker && message.stickerAltText && !message.messageText && (
            <p className="text-xs text-muted-foreground mt-1 italic">{message.stickerAltText}</p>
          )}
        </div>
      </div>

      {/* Actions — visible on hover */}
      {message.state === 'unread' && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead(message.id)
            }}
            className="p-1 rounded bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-green-400 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSave(message.id)
            }}
            className="p-1 rounded bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-yellow-400 transition-colors"
            title="Save for later"
          >
            <Bookmark className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* State badges */}
      {message.state === 'read' && (
        <div className="absolute top-2 right-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
            Read
          </span>
        </div>
      )}
      {message.state === 'saved' && (
        <div className="absolute top-2 right-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">
            Saved
          </span>
        </div>
      )}
    </motion.div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h`
}
