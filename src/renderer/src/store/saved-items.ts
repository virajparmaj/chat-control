import { create } from 'zustand'
import type { SavedArchiveItem, SortOrder } from '../../../shared/ipc-types'

export type SavedTypeFilter = 'all' | 'super_chat' | 'super_sticker'
export type SavedAmountFilter =
  | 'all'
  | 'fifty_plus'
  | 'twenty_to_forty_nine'
  | 'under_twenty'
  | 'stickers'

type PendingAction = 'markRead' | 'move' | 'copy'
type NoticeTone = 'success' | 'error'

export interface SavedItemsNotice {
  tone: NoticeTone
  message: string
}

interface SavedItemsState {
  items: SavedArchiveItem[]
  loading: boolean
  error: string | null
  sort: SortOrder
  typeFilter: SavedTypeFilter
  amountFilter: SavedAmountFilter
  exporting: boolean
  clearing: boolean
  clearConfirmOpen: boolean
  pendingById: Record<string, PendingAction | undefined>
  notice: SavedItemsNotice | null
  load: () => Promise<void>
  setSort: (sort: SortOrder) => void
  setTypeFilter: (filter: SavedTypeFilter) => void
  setAmountFilter: (filter: SavedAmountFilter) => void
  setClearConfirmOpen: (open: boolean) => void
  clearNotice: () => void
  markRead: (messageId: string) => Promise<void>
  moveToInbox: (messageId: string) => Promise<void>
  copyText: (messageId: string) => Promise<void>
  exportAll: () => Promise<void>
  clearAll: () => Promise<void>
  reset: () => void
}

type SavedItemsSetter = (
  partial: Partial<SavedItemsState> | ((state: SavedItemsState) => Partial<SavedItemsState>)
) => void

const INITIAL_STATE = {
  items: [] as SavedArchiveItem[],
  loading: true,
  error: null as string | null,
  sort: 'highest' as SortOrder,
  typeFilter: 'all' as SavedTypeFilter,
  amountFilter: 'all' as SavedAmountFilter,
  exporting: false,
  clearing: false,
  clearConfirmOpen: false,
  pendingById: {} as Record<string, PendingAction | undefined>,
  notice: null as SavedItemsNotice | null
}

export const useSavedItemsStore = create<SavedItemsState>((set, get) => ({
  ...INITIAL_STATE,

  load: async () => {
    set({ loading: true, error: null })

    try {
      const items = await window.api.superchats.listSaved(get().sort)
      set({ items, loading: false, error: null })
    } catch (error: unknown) {
      set({
        items: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load saved items right now.'
      })
    }
  },

  setSort: (sort) => set({ sort }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setAmountFilter: (amountFilter) => set({ amountFilter }),
  setClearConfirmOpen: (clearConfirmOpen) => set({ clearConfirmOpen }),
  clearNotice: () => set({ notice: null }),

  markRead: async (messageId) => {
    setPending(set, messageId, 'markRead')

    try {
      const updated = await window.api.superchats.markRead(messageId)
      if (!updated) {
        set({
          notice: { tone: 'error', message: 'Unable to mark this saved item as read.' }
        })
        return
      }

      set((state) => ({
        items: state.items.filter((item) => item.id !== messageId),
        notice: { tone: 'success', message: 'Saved item marked as read.' }
      }))
    } catch (error: unknown) {
      set({
        notice: {
          tone: 'error',
          message:
            error instanceof Error ? error.message : 'Unable to mark this saved item as read.'
        }
      })
    } finally {
      clearPending(set, messageId)
    }
  },

  moveToInbox: async (messageId) => {
    setPending(set, messageId, 'move')

    try {
      const updated = await window.api.superchats.undo(messageId)
      if (!updated) {
        set({
          notice: { tone: 'error', message: 'Unable to move this item back to the inbox.' }
        })
        return
      }

      set((state) => ({
        items: state.items.filter((item) => item.id !== messageId),
        notice: { tone: 'success', message: 'Saved item moved back to the inbox.' }
      }))
    } catch (error: unknown) {
      set({
        notice: {
          tone: 'error',
          message:
            error instanceof Error ? error.message : 'Unable to move this item back to the inbox.'
        }
      })
    } finally {
      clearPending(set, messageId)
    }
  },

  copyText: async (messageId) => {
    setPending(set, messageId, 'copy')

    try {
      const copied = await window.api.superchats.copyText(messageId)
      set({
        notice: copied
          ? { tone: 'success', message: 'Message text copied to clipboard.' }
          : { tone: 'error', message: 'This saved item has no message text to copy.' }
      })
    } catch (error: unknown) {
      set({
        notice: {
          tone: 'error',
          message: error instanceof Error ? error.message : 'Unable to copy message text.'
        }
      })
    } finally {
      clearPending(set, messageId)
    }
  },

  exportAll: async () => {
    set({ exporting: true, notice: null })

    try {
      const filePath = await window.api.superchats.exportSaved(get().sort)
      set({
        exporting: false,
        notice: filePath
          ? { tone: 'success', message: `Saved items exported to ${filePath}` }
          : { tone: 'error', message: 'There are no saved items to export.' }
      })
    } catch (error: unknown) {
      set({
        exporting: false,
        notice: {
          tone: 'error',
          message: error instanceof Error ? error.message : 'Unable to export saved items.'
        }
      })
    }
  },

  clearAll: async () => {
    set({ clearing: true, notice: null })

    try {
      const updated = await window.api.superchats.clearSaved()
      const clearedIds = new Set(updated.map((item) => item.id))
      set((state) => ({
        items: state.items.filter((item) => !clearedIds.has(item.id)),
        clearing: false,
        clearConfirmOpen: false,
        notice: updated.length
          ? { tone: 'success', message: 'All saved items were cleared from review.' }
          : { tone: 'error', message: 'There were no saved items to clear.' }
      }))
    } catch (error: unknown) {
      set({
        clearing: false,
        notice: {
          tone: 'error',
          message: error instanceof Error ? error.message : 'Unable to clear saved items.'
        }
      })
    }
  },

  reset: () => set(INITIAL_STATE)
}))

function setPending(set: SavedItemsSetter, messageId: string, action: PendingAction): void {
  set((state) => ({
    pendingById: {
      ...state.pendingById,
      [messageId]: action
    }
  }))
}

function clearPending(set: SavedItemsSetter, messageId: string): void {
  set((state) => {
    const nextPending = { ...state.pendingById }
    delete nextPending[messageId]
    return { pendingById: nextPending }
  })
}

export function getSavedItemAmount(
  item: Pick<SavedArchiveItem, 'convertedAmount' | 'originalAmount'>
): number {
  return item.convertedAmount ?? item.originalAmount
}

export function matchesSavedTypeFilter(item: SavedArchiveItem, filter: SavedTypeFilter): boolean {
  return filter === 'all' ? true : item.type === filter
}

export function matchesSavedAmountFilter(
  item: SavedArchiveItem,
  filter: SavedAmountFilter
): boolean {
  const amount = getSavedItemAmount(item)

  switch (filter) {
    case 'fifty_plus':
      return amount >= 50
    case 'twenty_to_forty_nine':
      return amount >= 20 && amount < 50
    case 'under_twenty':
      return amount < 20 && item.type !== 'super_sticker'
    case 'stickers':
      return item.type === 'super_sticker'
    default:
      return true
  }
}
