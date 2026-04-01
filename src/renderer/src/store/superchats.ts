import { create } from 'zustand'
import type {
  ActiveSessionSnapshot,
  DonorAggregate,
  PaidMessage,
  SessionStats,
  SortOrder
} from '../../../shared/ipc-types'

interface UndoEntry {
  messageId: string
  timer: ReturnType<typeof setTimeout>
}

interface SuperchatsState {
  sessionId: string | null
  messages: PaidMessage[]
  donors: DonorAggregate[]
  stats: SessionStats
  sort: SortOrder
  undoEntry: UndoEntry | null
  loading: boolean
  hydrateSnapshot: (snapshot: ActiveSessionSnapshot | null, sort: SortOrder) => void
  clear: () => void
  addMessage: (message: PaidMessage) => void
  upsertMessage: (message: PaidMessage) => void
  setDonors: (donors: DonorAggregate[]) => void
  setStats: (stats: SessionStats) => void
  markRead: (messageId: string) => Promise<void>
  save: (messageId: string) => Promise<void>
  markAllRead: () => Promise<number>
  undo: () => Promise<void>
  setSort: (sort: SortOrder) => void
}

export const EMPTY_STATS: SessionStats = {
  totalConverted: 0,
  messageCount: 0,
  stickerCount: 0,
  unreadCount: 0,
  savedCount: 0,
  averageDonation: 0,
  convertedCurrency: null
}

export const useSuperchatStore = create<SuperchatsState>((set, get) => ({
  sessionId: null,
  messages: [],
  donors: [],
  stats: EMPTY_STATS,
  sort: 'latest',
  undoEntry: null,
  loading: true,

  hydrateSnapshot: (snapshot, sort) => {
    if (!snapshot) {
      set({
        sessionId: null,
        messages: [],
        donors: [],
        stats: EMPTY_STATS,
        sort,
        loading: false,
        undoEntry: null
      })
      return
    }

    const messages = sortMessages(snapshot.messages, sort)
    set({
      sessionId: snapshot.session.id,
      messages,
      donors: snapshot.donors,
      stats: snapshot.stats,
      sort,
      loading: false,
      undoEntry: null
    })
  },

  clear: () => {
    const undoEntry = get().undoEntry
    if (undoEntry) clearTimeout(undoEntry.timer)
    set({
      sessionId: null,
      messages: [],
      donors: [],
      stats: EMPTY_STATS,
      undoEntry: null,
      loading: false
    })
  },

  addMessage: (message) => {
    set((state) => {
      if (state.sessionId && state.sessionId !== message.sessionId) return state
      const exists = state.messages.some((candidate) => candidate.id === message.id)
      if (exists) return state
      const messages = sortMessages([message, ...state.messages], state.sort)
      return {
        sessionId: state.sessionId ?? message.sessionId,
        messages,
        stats: computeStats(messages, state.stats.convertedCurrency ?? message.convertedCurrency)
      }
    })
  },

  upsertMessage: (message) => {
    set((state) => {
      if (state.sessionId && state.sessionId !== message.sessionId) return state
      const existingIndex = state.messages.findIndex((candidate) => candidate.id === message.id)
      const nextMessages = [...state.messages]
      if (existingIndex === -1) {
        nextMessages.unshift(message)
      } else {
        nextMessages[existingIndex] = message
      }

      const messages = sortMessages(nextMessages, state.sort)
      return {
        sessionId: state.sessionId ?? message.sessionId,
        messages,
        stats: computeStats(messages, state.stats.convertedCurrency ?? message.convertedCurrency)
      }
    })
  },

  setDonors: (donors) => {
    set({ donors })
  },

  setStats: (stats) => {
    set({ stats })
  },

  markRead: async (messageId: string) => {
    const existingUndo = get().undoEntry
    if (existingUndo) clearTimeout(existingUndo.timer)

    const updated = await window.api.superchats.markRead(messageId)
    if (!updated) return

    const timer = setTimeout(() => {
      set({ undoEntry: null })
    }, 5000)

    get().upsertMessage(updated)
    set({ undoEntry: { messageId, timer } })
  },

  save: async (messageId: string) => {
    const existingUndo = get().undoEntry
    if (existingUndo) clearTimeout(existingUndo.timer)

    const updated = await window.api.superchats.save(messageId)
    if (!updated) return

    const timer = setTimeout(() => {
      set({ undoEntry: null })
    }, 5000)

    get().upsertMessage(updated)
    set({ undoEntry: { messageId, timer } })
  },

  markAllRead: async () => {
    const sessionId = get().sessionId
    if (!sessionId) return 0

    const existingUndo = get().undoEntry
    if (existingUndo) clearTimeout(existingUndo.timer)

    const updatedMessages = await window.api.superchats.markAllRead(sessionId)
    if (updatedMessages.length === 0) {
      set({ undoEntry: null })
      return 0
    }

    for (const message of updatedMessages) {
      get().upsertMessage(message)
    }

    set({ undoEntry: null })
    return updatedMessages.length
  },

  undo: async () => {
    const entry = get().undoEntry
    if (!entry) return

    clearTimeout(entry.timer)
    const updated = await window.api.superchats.undo(entry.messageId)
    if (!updated) {
      set({ undoEntry: null })
      return
    }

    get().upsertMessage(updated)
    set({ undoEntry: null })
  },

  setSort: (sort) => {
    set((state) => ({
      sort,
      messages: sortMessages(state.messages, sort)
    }))
  }
}))

export function computeStats(
  messages: PaidMessage[],
  convertedCurrency: string | null
): SessionStats {
  let totalConverted = 0
  let unreadCount = 0
  let savedCount = 0
  let stickerCount = 0

  for (const message of messages) {
    totalConverted += message.convertedAmount ?? message.originalAmount
    if (message.state === 'unread') unreadCount += 1
    if (message.state === 'saved') savedCount += 1
    if (message.type === 'super_sticker') stickerCount += 1
  }

  const messageCount = messages.length

  return {
    totalConverted,
    unreadCount,
    savedCount,
    stickerCount,
    messageCount,
    averageDonation: messageCount > 0 ? totalConverted / messageCount : 0,
    convertedCurrency
  }
}

export function sortMessages(messages: PaidMessage[], sort: SortOrder): PaidMessage[] {
  const sorted = [...messages]

  switch (sort) {
    case 'latest':
      sorted.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      break
    case 'oldest':
      sorted.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
      break
    case 'highest':
      sorted.sort(
        (a, b) => (b.convertedAmount ?? b.originalAmount) - (a.convertedAmount ?? a.originalAmount)
      )
      break
  }

  return sorted
}
