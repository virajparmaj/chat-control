import { useEffect, useMemo } from 'react'
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clipboard,
  Download,
  Inbox,
  Loader2,
  Sparkles,
  Trash2
} from 'lucide-react'
import { formatCurrency } from '../../lib/currency'
import { getTierConfig } from '../../lib/tiers'
import { useStreamStore } from '../../store/stream'
import {
  getSavedItemAmount,
  matchesSavedAmountFilter,
  matchesSavedTypeFilter,
  type SavedAmountFilter,
  type SavedTypeFilter,
  useSavedItemsStore
} from '../../store/saved-items'
import type { SavedArchiveItem, SortOrder } from '../../../../shared/ipc-types'

const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f7fb] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d12] focus-visible:shadow-[0_0_0_4px_rgba(225,29,46,0.26)]'

const pageCardClass =
  'rounded-[22px] border border-[#202a38] bg-[linear-gradient(180deg,rgba(18,24,33,0.98)_0%,rgba(16,21,29,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_44px_rgba(0,0,0,0.28)]'

const utilityButtonClass = `inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#253041] bg-[#171f29] px-5 text-[13px] font-medium text-[#dce4ee] transition-all duration-150 hover:border-[#334259] hover:bg-[#1b2430] disabled:cursor-not-allowed disabled:border-[#212937] disabled:text-[#6e7b8c] ${focusRingClass}`

const secondaryActionClass = `inline-flex h-10 items-center justify-center rounded-[10px] border border-[#263142] bg-[#18212d] px-4 text-[12px] font-medium text-[#aeb9c8] transition-all duration-150 hover:border-[#33445d] hover:bg-[#1d2734] hover:text-[#f3f6fa] disabled:cursor-not-allowed disabled:border-[#212937] disabled:bg-[#141b24] disabled:text-[#667385] ${focusRingClass}`

const TYPE_FILTERS: Array<{ id: SavedTypeFilter; label: string }> = [
  { id: 'all', label: 'All Items' },
  { id: 'super_chat', label: 'Super Chats' },
  { id: 'super_sticker', label: 'Stickers' }
]

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'highest', label: 'Amount' },
  { value: 'latest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' }
]

const AMOUNT_TILES: Array<{
  id: SavedAmountFilter
  label: string
  countLabel: string
}> = [
  { id: 'fifty_plus', label: '$50+', countLabel: '$50+' },
  { id: 'twenty_to_forty_nine', label: '$20 - $49', countLabel: '$20 - $49' },
  { id: 'under_twenty', label: 'Under $20', countLabel: 'Under $20' },
  { id: 'stickers', label: 'Stickers', countLabel: 'Stickers' }
]

export function SavedItems(): React.JSX.Element {
  const activeSession = useStreamStore((state) => state.activeSession)
  const {
    items,
    loading,
    error,
    sort,
    typeFilter,
    amountFilter,
    exporting,
    clearing,
    clearConfirmOpen,
    pendingById,
    notice,
    load,
    setSort,
    setTypeFilter,
    setAmountFilter,
    setClearConfirmOpen,
    clearNotice,
    markRead,
    moveToInbox,
    copyText,
    exportAll,
    clearAll
  } = useSavedItemsStore((state) => state)

  useEffect(() => {
    void load()
  }, [load, sort])

  useEffect(() => {
    const unsubscribe = window.api.on.superchatUpdated(() => {
      void useSavedItemsStore.getState().load()
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => clearNotice(), 4000)
    return () => window.clearTimeout(timeout)
  }, [clearNotice, notice])

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        matchesSavedTypeFilter(item, typeFilter) && matchesSavedAmountFilter(item, amountFilter)
    )
  }, [amountFilter, items, typeFilter])

  const heroCount = filteredItems.length
  const archiveCount = items.length
  const totalValue = items.reduce((sum, item) => sum + getSavedItemAmount(item), 0)
  const highestValue = items.reduce((max, item) => Math.max(max, getSavedItemAmount(item)), 0)
  const archiveCurrency =
    items.find((item) => item.convertedCurrency)?.convertedCurrency ??
    items.find((item) => item.originalCurrency)?.originalCurrency ??
    'USD'
  const amountCounts = useMemo(
    () => ({
      fifty_plus: items.filter((item) => matchesSavedAmountFilter(item, 'fifty_plus')).length,
      twenty_to_forty_nine: items.filter((item) =>
        matchesSavedAmountFilter(item, 'twenty_to_forty_nine')
      ).length,
      under_twenty: items.filter((item) => matchesSavedAmountFilter(item, 'under_twenty')).length,
      stickers: items.filter((item) => matchesSavedAmountFilter(item, 'stickers')).length
    }),
    [items]
  )

  const primaryItem = filteredItems[0] ?? null
  const secondaryItem = filteredItems[1] ?? null
  const leftColumnItems = filteredItems.filter((_, index) => index !== 1)
  const overflowCount = Math.max(filteredItems.length - 5, 0)

  const handleClearAll = (): void => {
    if (!clearConfirmOpen) {
      setClearConfirmOpen(true)
      return
    }
    void clearAll()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[2.2rem] font-semibold tracking-[-0.05em] text-[#f4f7fb]">
              Saved Items
            </h1>
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#2b8dff] px-3 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(43,141,255,0.22)]">
              {heroCount}
            </span>
          </div>
          <p className="mt-2 text-[14px] text-[#7f8c9d]">
            Important messages saved for later attention
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 xl:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void exportAll()}
              disabled={exporting || archiveCount === 0}
              className={utilityButtonClass}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export All
            </button>

            {clearConfirmOpen && archiveCount > 0 && (
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className="text-[12px] font-medium text-[#9aa6b6] transition-colors hover:text-[#f4f7fb]"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing || archiveCount === 0}
              className={`${utilityButtonClass} ${
                clearConfirmOpen
                  ? 'border-[#7d2028] bg-[#38141a] text-[#fff1f2] hover:border-[#97303a] hover:bg-[#4b171f]'
                  : ''
              }`}
            >
              {clearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {clearConfirmOpen ? 'Confirm Clear' : 'Clear All'}
            </button>
          </div>

          <p
            aria-live="polite"
            className={`min-h-[1rem] text-[12px] ${
              notice
                ? notice.tone === 'error'
                  ? 'text-[#ff9ba6]'
                  : 'text-[#8fbfff]'
                : 'text-transparent'
            }`}
          >
            {notice?.message ?? 'Saved archive actions run through local production data.'}
          </p>
        </div>
      </header>

      <section
        className={`${pageCardClass} flex flex-col gap-3 p-2.5 md:flex-row md:items-center md:justify-between`}
      >
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((filter) => {
            const active = typeFilter === filter.id
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTypeFilter(filter.id)}
                className={`inline-flex h-11 items-center justify-center rounded-[11px] px-6 text-[14px] font-medium transition-all duration-150 ${
                  active
                    ? 'border border-[#712028] bg-[#3a1419] text-[#ff5c68] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_28px_rgba(225,29,46,0.14)]'
                    : 'border border-transparent text-[#9ba7b7] hover:border-white/6 hover:bg-white/[0.03] hover:text-[#eef2f7]'
                } ${focusRingClass}`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <span className="text-[12px] font-semibold text-[#778496]">Sort by:</span>
          <label className="relative">
            <span className="sr-only">Sort saved items</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOrder)}
              className={`h-10 min-w-[124px] appearance-none rounded-[10px] border border-[#222c3a] bg-[#171f29] pl-4 pr-10 text-[13px] font-medium text-[#e4ebf4] transition-colors hover:border-[#334259] ${focusRingClass}`}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#738094]" />
          </label>
        </div>
      </section>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : archiveCount === 0 ? (
        <EmptyState
          title="No saved items yet"
          description="Save important Super Chats from the live monitoring workflow and they will appear here for calmer review."
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No saved items match these filters"
          description="Adjust the type or amount filters to bring saved messages back into view."
          action={
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all')
                setAmountFilter('all')
              }}
              className={utilityButtonClass}
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.94fr)]">
          <div className="space-y-4">
            {leftColumnItems.map((item) => (
              <SavedItemCard
                key={item.id}
                item={item}
                visualIndex={filteredItems.findIndex((candidate) => candidate.id === item.id)}
                isLead={item.id === primaryItem?.id}
                canMoveToInbox={activeSession?.id === item.sessionId}
                pendingAction={pendingById[item.id]}
                onMarkRead={() => void markRead(item.id)}
                onMoveToInbox={() => void moveToInbox(item.id)}
                onCopyText={() => void copyText(item.id)}
              />
            ))}
          </div>

          <div className="space-y-4">
            {secondaryItem ? (
              <SavedItemCard
                item={secondaryItem}
                visualIndex={1}
                isLead={false}
                canMoveToInbox={activeSession?.id === secondaryItem.sessionId}
                pendingAction={pendingById[secondaryItem.id]}
                onMarkRead={() => void markRead(secondaryItem.id)}
                onMoveToInbox={() => void moveToInbox(secondaryItem.id)}
                onCopyText={() => void copyText(secondaryItem.id)}
              />
            ) : null}

            <SummaryPanel
              count={archiveCount}
              totalValue={totalValue}
              highestValue={highestValue}
              currency={archiveCurrency}
            />

            <AmountPanel
              counts={amountCounts}
              activeFilter={amountFilter}
              onSelect={(filter) => setAmountFilter(amountFilter === filter ? 'all' : filter)}
            />

            <OverflowPanel count={overflowCount} />
          </div>
        </section>
      )}
    </div>
  )
}

function SavedItemCard({
  item,
  visualIndex,
  isLead,
  canMoveToInbox,
  pendingAction,
  onMarkRead,
  onMoveToInbox,
  onCopyText
}: {
  item: SavedArchiveItem
  visualIndex: number
  isLead: boolean
  canMoveToInbox: boolean
  pendingAction?: 'markRead' | 'move' | 'copy'
  onMarkRead: () => void
  onMoveToInbox: () => void
  onCopyText: () => void
}): React.JSX.Element {
  const palette = getSavedCardPalette(item, visualIndex, isLead)
  const displayAmount =
    item.amountDisplayString ??
    formatCurrency(
      item.convertedAmount ?? item.originalAmount,
      item.convertedCurrency ?? item.originalCurrency
    )
  const isSticker = item.type === 'super_sticker'
  const pending = pendingAction !== undefined

  return (
    <article
      className={`group relative overflow-hidden rounded-[20px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_44px_rgba(0,0,0,0.22)] transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_48px_rgba(0,0,0,0.3)] ${focusRingClass}`}
      style={{
        borderColor: palette.border,
        background: palette.background
      }}
      tabIndex={0}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80"
        style={{ background: palette.highlight }}
      />

      <div className="flex items-start gap-3">
        <Avatar item={item} color={palette.avatar} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-[#f4f7fb]">
                  {item.donorDisplayName}
                </p>
                {isSticker ? <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#e2b34b]" /> : null}
              </div>
              <p className="mt-1 text-[11px] font-medium text-[#8f9baa]">
                {formatSavedTimestamp(item.receivedAt)}
              </p>
            </div>

            <div
              className="shrink-0 rounded-[10px] border px-3 py-1.5 text-[1.03rem] font-semibold tracking-[-0.03em]"
              style={{
                color: palette.amountText,
                background: palette.amountBackground,
                borderColor: palette.amountBorder
              }}
            >
              {displayAmount}
            </div>
          </div>

          {item.messageText ? (
            <p className="mt-3 text-[15px] leading-[1.45] text-[#e8edf4]">{item.messageText}</p>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[14px] border border-white/6 bg-black/10 px-3 py-3">
              <p className="text-[13px] italic text-[#bdc7d4]">
                {item.stickerAltText ?? 'Sent a Super Sticker'}
              </p>
              <div
                className="h-11 w-12 shrink-0 rounded-[10px] border"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(209,172,76,0.16) 0%, rgba(62,51,24,0.32) 100%)',
                  borderColor: 'rgba(209,172,76,0.2)'
                }}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionButton
              label="Mark as Read"
              pending={pendingAction === 'markRead'}
              onClick={onMarkRead}
              tone={isLead ? 'primary' : 'secondary'}
              disabled={pending}
            >
              <Check className="h-3.5 w-3.5" />
            </ActionButton>

            <ActionButton
              label="Move to Inbox"
              pending={pendingAction === 'move'}
              onClick={onMoveToInbox}
              tone="secondary"
              disabled={pending || !canMoveToInbox}
              title={
                canMoveToInbox
                  ? undefined
                  : 'Available only for items from the current active session.'
              }
            >
              <Inbox className="h-3.5 w-3.5" />
            </ActionButton>

            {item.messageText ? (
              <ActionButton
                label="Copy Text"
                pending={pendingAction === 'copy'}
                onClick={onCopyText}
                tone="secondary"
                disabled={pending}
              >
                <Clipboard className="h-3.5 w-3.5" />
              </ActionButton>
            ) : null}
          </div>

          {!canMoveToInbox ? (
            <p className="mt-3 text-[11px] text-[#738093]">
              Move to Inbox is available only for saved items from the current live session.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function SummaryPanel({
  count,
  totalValue,
  highestValue,
  currency
}: {
  count: number
  totalValue: number
  highestValue: number
  currency: string
}): React.JSX.Element {
  return (
    <section className={`${pageCardClass} p-5`}>
      <div className="mb-5 flex items-center gap-3">
        <span className="h-6 w-[3px] rounded-full bg-[#3d9cff]" />
        <h2 className="text-[1.08rem] font-semibold tracking-[-0.03em] text-[#f4f7fb]">
          Saved Summary
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric value={String(count)} label="Total Saved" valueClass="text-[#f4f7fb]" />
        <Metric
          value={formatCurrency(totalValue, currency)}
          label="Total Value"
          valueClass="text-[#26d39a]"
        />
        <Metric
          value={formatCurrency(highestValue, currency)}
          label="Highest"
          valueClass="text-[#ff4659]"
        />
      </div>
    </section>
  )
}

function Metric({
  value,
  label,
  valueClass
}: {
  value: string
  label: string
  valueClass: string
}): React.JSX.Element {
  return (
    <div className="rounded-[16px] border border-white/5 bg-white/[0.015] px-3 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <p className={`text-[1.15rem] font-semibold tracking-[-0.04em] ${valueClass}`}>{value}</p>
      <p className="mt-2 text-[11px] text-[#7c8897]">{label}</p>
    </div>
  )
}

function AmountPanel({
  counts,
  activeFilter,
  onSelect
}: {
  counts: Record<'fifty_plus' | 'twenty_to_forty_nine' | 'under_twenty' | 'stickers', number>
  activeFilter: SavedAmountFilter
  onSelect: (filter: SavedAmountFilter) => void
}): React.JSX.Element {
  return (
    <section className={`${pageCardClass} p-5`}>
      <h2 className="text-[1.08rem] font-semibold tracking-[-0.03em] text-[#f4f7fb]">
        Filter by Amount
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {AMOUNT_TILES.map((tile) => {
          const active = activeFilter === tile.id
          const stickersEmphasis = tile.id === 'stickers'
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(tile.id)}
              className={`rounded-[15px] border px-4 py-4 text-left transition-all duration-150 ${
                active
                  ? 'border-[#8f6b18] bg-[linear-gradient(180deg,rgba(57,48,25,0.95)_0%,rgba(45,37,18,0.95)_100%)] shadow-[0_16px_32px_rgba(0,0,0,0.22)]'
                  : stickersEmphasis
                    ? 'border-[#6a581d] bg-[linear-gradient(180deg,rgba(46,40,24,0.92)_0%,rgba(37,31,18,0.92)_100%)]'
                    : 'border-[#1e2835] bg-[#151c26] hover:border-[#2d3a4e] hover:bg-[#18212d]'
              } ${focusRingClass}`}
            >
              <p
                className={`text-[1.35rem] font-semibold tracking-[-0.04em] ${
                  active ? 'text-[#f2c85b]' : stickersEmphasis ? 'text-[#d8b04a]' : 'text-[#f4f7fb]'
                }`}
              >
                {counts[tile.id]}
              </p>
              <p
                className={`mt-2 text-[12px] ${
                  active ? 'text-[#f2c85b]' : stickersEmphasis ? 'text-[#d2a944]' : 'text-[#8894a4]'
                }`}
              >
                {tile.countLabel}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function OverflowPanel({ count }: { count: number }): React.JSX.Element {
  return (
    <section className="rounded-[22px] border border-dashed border-[#223040] bg-[linear-gradient(180deg,rgba(16,21,29,0.92)_0%,rgba(12,17,24,0.92)_100%)] px-6 py-11 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <p className="text-[1.05rem] font-semibold tracking-[-0.03em] text-[#dbe3ed]">
        {count > 0 ? `${count} more saved items` : 'All saved items are visible'}
      </p>
      <p className="mt-3 text-[13px] text-[#7f8c9d]">
        {count > 0
          ? 'Scroll to view all saved messages'
          : 'Your saved review queue is fully in view.'}
      </p>
    </section>
  )
}

function LoadingState(): React.JSX.Element {
  return (
    <section className="grid animate-pulse gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.94fr)]">
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[154px] rounded-[20px] border border-[#202a38] bg-[linear-gradient(180deg,rgba(20,26,35,0.98)_0%,rgba(15,20,28,0.98)_100%)]"
          />
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-[138px] rounded-[20px] border border-[#202a38] bg-[#131a24]" />
        <div className="h-[170px] rounded-[20px] border border-[#202a38] bg-[#131a24]" />
        <div className="h-[170px] rounded-[20px] border border-[#202a38] bg-[#131a24]" />
        <div className="h-[136px] rounded-[20px] border border-dashed border-[#223040] bg-[#121821]" />
      </div>
    </section>
  )
}

function EmptyState({
  title,
  description,
  action
}: {
  title: string
  description: string
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <section className={`${pageCardClass} px-8 py-14 text-center`}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#243042] bg-[#161d28] text-[#8da0b5]">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-[1.35rem] font-semibold tracking-[-0.04em] text-[#f4f7fb]">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-[34rem] text-[14px] leading-7 text-[#8290a1]">
        {description}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }): React.JSX.Element {
  return (
    <section className="rounded-[22px] border border-[#5b2027] bg-[linear-gradient(180deg,rgba(31,16,20,0.96)_0%,rgba(22,10,13,0.96)_100%)] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-[36rem]">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#7a2530] bg-[#34161b] text-[#ff8f9a]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-[1.2rem] font-semibold text-[#f4f7fb]">Saved archive unavailable</p>
          <p className="mt-2 text-[14px] leading-7 text-[#9ea9b7]">{error}</p>
        </div>

        <button type="button" onClick={onRetry} className={utilityButtonClass}>
          Retry
        </button>
      </div>
    </section>
  )
}

function ActionButton({
  label,
  pending,
  onClick,
  tone,
  disabled,
  title,
  children
}: {
  label: string
  pending: boolean
  onClick: () => void
  tone: 'primary' | 'secondary'
  disabled?: boolean
  title?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[12px] font-medium transition-all duration-150 ${
        tone === 'primary'
          ? 'border border-[#bc2432] bg-[#e11d2e] text-[#fff4f5] hover:bg-[#f23545]'
          : secondaryActionClass
      }`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
      {label}
    </button>
  )
}

function Avatar({ item, color }: { item: SavedArchiveItem; color: string }): React.JSX.Element {
  if (item.donorAvatarUrl) {
    return (
      <img
        src={item.donorAvatarUrl}
        alt=""
        className="h-11 w-11 shrink-0 rounded-full border border-white/10 object-cover"
      />
    )
  }

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-[13px] font-semibold text-white"
      style={{ background: color }}
    >
      {item.donorDisplayName.charAt(0).toUpperCase()}
    </div>
  )
}

function getSavedCardPalette(
  item: SavedArchiveItem,
  visualIndex: number,
  isLead: boolean
): {
  background: string
  border: string
  highlight: string
  amountBackground: string
  amountBorder: string
  amountText: string
  avatar: string
} {
  const amount = getSavedItemAmount(item)

  if (item.type === 'super_sticker') {
    return paletteFromHex('#d1ac4c', '#3d331b', visualIndex, isLead)
  }

  if (item.sessionStatus !== 'active' && amount <= 10) {
    return {
      background: 'linear-gradient(180deg, rgba(21,28,38,0.98) 0%, rgba(18,24,33,0.98) 100%)',
      border: 'rgba(89, 102, 118, 0.32)',
      highlight:
        'linear-gradient(90deg, rgba(170,182,195,0) 0%, rgba(170,182,195,0.7) 50%, rgba(170,182,195,0) 100%)',
      amountBackground: 'rgba(146, 157, 170, 0.12)',
      amountBorder: 'rgba(146, 157, 170, 0.18)',
      amountText: '#d4dce6',
      avatar: '#a8b3c1'
    }
  }

  if (isLead || amount >= 50 || item.tier >= 7) {
    return paletteFromHex('#e11d2e', '#44161c', visualIndex, true)
  }

  if (amount >= 20 || item.tier <= 1) {
    return paletteFromHex('#4b9eff', '#162e4d', visualIndex, false)
  }

  return paletteFromHex(getTierConfig(item.tier).accent, '#14362b', visualIndex, false)
}

function paletteFromHex(
  accent: string,
  deepTone: string,
  visualIndex: number,
  emphasized: boolean
): {
  background: string
  border: string
  highlight: string
  amountBackground: string
  amountBorder: string
  amountText: string
  avatar: string
} {
  const borderAlpha = emphasized ? 0.34 : 0.24
  const surfaceAlpha = emphasized ? 0.12 : 0.08
  const glowAlpha = emphasized ? 0.18 : 0.12

  return {
    background: `linear-gradient(180deg, ${hexToRgba(accent, surfaceAlpha)} 0%, ${hexToRgba(deepTone, 0.18)} 100%)`,
    border: hexToRgba(accent, borderAlpha),
    highlight: `linear-gradient(90deg, ${hexToRgba(accent, 0)} 0%, ${hexToRgba(accent, emphasized ? 0.75 : 0.55)} 50%, ${hexToRgba(accent, 0)} 100%)`,
    amountBackground: hexToRgba(accent, glowAlpha),
    amountBorder: hexToRgba(accent, emphasized ? 0.32 : 0.24),
    amountText: accent,
    avatar: visualIndex === 1 ? '#adb7c4' : accent
  }
}

function formatSavedTimestamp(value: string): string {
  const date = new Date(value)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (24 * 60 * 60 * 1000)
  )
  const timeLabel = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (diffDays === 0) return `Today at ${timeLabel}`
  if (diffDays === 1) return `Yesterday at ${timeLabel}`
  if (diffDays > 1 && diffDays < 4) return `${diffDays} days ago`

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  })
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized

  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
