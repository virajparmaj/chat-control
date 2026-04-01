import { Bookmark, Check, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { getTierConfig } from '../../lib/tiers'
import { formatCurrency } from '../../lib/currency'
import { getTimeAgo } from '../../lib/time'
import type { PaidMessage } from '../../../../shared/ipc-types'

interface SuperChatCardProps {
  message: PaidMessage
  onMarkRead: (id: string) => void
  onSave: (id: string) => void
  compact?: boolean
  isActive?: boolean
}

export function SuperChatCard({
  message,
  onMarkRead,
  onSave,
  compact = false,
  isActive = false
}: SuperChatCardProps): React.JSX.Element {
  const tier = getTierConfig(message.tier)
  const isSticker = message.type === 'super_sticker'
  const isUnread = message.state === 'unread'
  const isRead = message.state === 'read'
  const isSaved = message.state === 'saved'
  const isMuted = !isActive && isRead

  const timeAgo = getTimeAgo(message.receivedAt)
  const originalDisplay =
    message.amountDisplayString ?? formatCurrency(message.originalAmount, message.originalCurrency)
  const convertedDisplay =
    message.convertedAmount !== null && message.convertedCurrency
      ? formatCurrency(message.convertedAmount, message.convertedCurrency)
      : null
  const accentColor = isMuted ? '#5f6b7a' : tier.accent
  const borderColor = isMuted
    ? 'rgba(111, 123, 140, 0.24)'
    : isActive
      ? hexToRgba(accentColor, 0.45)
      : hexToRgba(accentColor, isSaved ? 0.34 : 0.24)
  const backgroundColor = isMuted
    ? '#0f141b'
    : isActive
      ? hexToRgba(accentColor, 0.16)
      : hexToRgba(accentColor, isSaved ? 0.12 : 0.08)
  const shadow = isActive
    ? `0 18px 36px ${hexToRgba('#000000', 0.28)}, inset 0 1px 0 rgba(255,255,255,0.05)`
    : '0 10px 22px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)'
  const amountTextColor = isMuted ? '#aeb8c5' : accentColor
  const amountBadgeStyle = {
    color: amountTextColor,
    backgroundColor: isMuted
      ? 'rgba(95,107,122,0.14)'
      : hexToRgba(accentColor, isActive ? 0.18 : 0.14),
    borderColor: isMuted ? 'rgba(111,123,140,0.22)' : hexToRgba(accentColor, 0.28)
  }
  const avatarStyle = {
    backgroundColor: isMuted ? '#4f5968' : tier.avatarBg.replace('bg-[', '').replace(']', '')
  }
  const avatarClassName =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`group relative overflow-hidden rounded-[18px] border px-3.5 py-3.5 transition-all duration-200 focus-within:border-white/22 hover:-translate-y-[1px] ${
        compact && !isActive ? 'px-3 py-3' : ''
      }`}
      style={{
        borderColor,
        backgroundColor,
        boxShadow: shadow
      }}
    >
      <div
        className="absolute inset-y-3 left-0 w-px rounded-full"
        style={{ backgroundColor: hexToRgba(accentColor, isMuted ? 0.5 : 0.8) }}
      />

      <div className="ml-1 flex items-start gap-3">
        {message.donorAvatarUrl ? (
          <img
            src={message.donorAvatarUrl}
            alt=""
            className={`${avatarClassName} object-cover`}
            style={{ backgroundColor: '#151c25' }}
          />
        ) : (
          <div className={avatarClassName} style={avatarStyle}>
            <span className="sr-only">{message.donorDisplayName}</span>
            <span className="text-[11px] font-semibold uppercase text-white/80">
              {getInitial(message.donorDisplayName)}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {isActive ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[1.08rem] font-semibold tracking-[-0.03em] text-[#f3f6fa]">
                    {message.donorDisplayName}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#c0c9d5]">{timeAgo}</p>
                </div>
                <div
                  className="shrink-0 rounded-[10px] border px-3 py-1.5 text-[1.05rem] font-bold tracking-[-0.03em]"
                  style={amountBadgeStyle}
                >
                  {originalDisplay}
                </div>
              </div>

              {message.messageText ? (
                <p className="mt-3 text-[15px] leading-[1.42] text-[#f6f8fb]">
                  {message.messageText}
                </p>
              ) : (
                <StickerMessage
                  stickerAltText={message.stickerAltText}
                  accentColor={accentColor}
                  inline={false}
                />
              )}

              <div className="mt-4 flex items-center gap-2">
                <ActionButton
                  label="Mark Read"
                  variant="primary"
                  onClick={() => onMarkRead(message.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton label="Save" variant="secondary" onClick={() => onSave(message.id)}>
                  <Bookmark className="h-3.5 w-3.5" />
                </ActionButton>
              </div>
            </>
          ) : (
            <div
              className={`flex items-start justify-between gap-3 ${compact ? 'min-h-[68px]' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p
                    className={`truncate text-[1.02rem] font-semibold tracking-[-0.03em] ${
                      isMuted ? 'text-[#a8b2c0]' : 'text-[#dfe7f1]'
                    }`}
                  >
                    {message.donorDisplayName}
                  </p>
                  {isSticker ? <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#d0a43b]" /> : null}
                  <div
                    className="shrink-0 rounded-[8px] border px-2 py-0.5 text-sm font-semibold"
                    style={amountBadgeStyle}
                  >
                    {originalDisplay}
                  </div>
                  {renderStateBadge(message.state)}
                </div>

                {message.messageText ? (
                  <p
                    className={`mt-2 text-[15px] leading-[1.35] ${
                      isMuted ? 'text-[#b2bcc8]' : 'text-[#d2dbe6]'
                    } ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}
                  >
                    {message.messageText}
                  </p>
                ) : (
                  <StickerMessage
                    stickerAltText={message.stickerAltText}
                    accentColor={accentColor}
                    inline
                  />
                )}

                {convertedDisplay && convertedDisplay !== originalDisplay ? (
                  <p className="mt-2 text-[11px] text-[#8e9aac]">Converted {convertedDisplay}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-start gap-2">
                {isSticker ? (
                  <div
                    className="mt-0.5 h-10 w-10 rounded-[10px] border"
                    style={{
                      backgroundColor: hexToRgba('#d0a43b', 0.14),
                      borderColor: hexToRgba('#d0a43b', 0.18)
                    }}
                  />
                ) : null}
                <div className="pt-0.5 text-[11px] font-medium text-[#8e9aae]">{timeAgo}</div>
              </div>
            </div>
          )}

          {convertedDisplay && convertedDisplay !== originalDisplay && isActive ? (
            <p className="mt-2 text-[11px] text-[#9aa6b4]">Converted {convertedDisplay}</p>
          ) : null}
        </div>
      </div>

      {!isActive && isUnread ? (
        <div className="pointer-events-none absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
          <IconActionButton label="Mark read" onClick={() => onMarkRead(message.id)} tone="green">
            <Check className="h-3.5 w-3.5" />
          </IconActionButton>
          <IconActionButton label="Save" onClick={() => onSave(message.id)} tone="amber">
            <Bookmark className="h-3.5 w-3.5" />
          </IconActionButton>
        </div>
      ) : null}
    </motion.div>
  )
}

function StickerMessage({
  stickerAltText,
  accentColor,
  inline
}: {
  stickerAltText: string | null
  accentColor: string
  inline: boolean
}): React.JSX.Element {
  return (
    <p
      className={`${inline ? 'mt-2' : 'mt-3'} text-sm italic text-[#9ba6b3]`}
      style={{ color: inline ? undefined : hexToRgba(accentColor, 0.88) }}
    >
      {stickerAltText ?? 'Sent a Super Sticker'}
    </p>
  )
}

function ActionButton({
  label,
  variant,
  onClick,
  children
}: {
  label: string
  variant: 'primary' | 'secondary'
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const className =
    variant === 'primary'
      ? 'bg-[#f32739] text-white hover:bg-[#ff4151]'
      : 'border border-white/10 bg-white/[0.04] text-[#aab4c2] hover:border-white/16 hover:bg-white/[0.07] hover:text-[#eff4fa]'

  return (
    <button
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-6 text-sm font-semibold transition-colors ${className}`}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}

function IconActionButton({
  label,
  onClick,
  tone,
  children
}: {
  label: string
  onClick: () => void
  tone: 'green' | 'amber'
  children: React.ReactNode
}): React.JSX.Element {
  const hoverClass = tone === 'green' ? 'hover:text-[#3ddc97]' : 'hover:text-[#e7b954]'

  return (
    <button
      onClick={onClick}
      className={`rounded-[9px] border border-white/10 bg-[#10161e]/90 p-1.5 text-[#93a0b2] shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors ${hoverClass}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

function renderStateBadge(state: PaidMessage['state']): React.JSX.Element | null {
  if (state === 'saved') {
    return (
      <span className="rounded-full border border-[#416ea9]/25 bg-[#173351]/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7fb4ff]">
        Saved
      </span>
    )
  }

  if (state === 'read') {
    return (
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#90a0b3]">
        Read
      </span>
    )
  }

  return null
}

function getInitial(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) return '?'
  return trimmed[0]!.toUpperCase()
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized

  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
