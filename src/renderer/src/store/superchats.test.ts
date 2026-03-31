import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActiveSessionSnapshot, PaidMessage, SortOrder } from '../../../shared/ipc-types'
import { EMPTY_STATS, computeStats, sortMessages, useSuperchatStore } from './superchats'

function createMessage(id: string, overrides: Partial<PaidMessage> = {}): PaidMessage {
  return {
    id,
    youtubeMessageId: `yt-${id}`,
    sessionId: 'session-1',
    donorChannelId: `donor-${id}`,
    donorDisplayName: `Donor ${id}`,
    donorAvatarUrl: null,
    type: 'super_chat',
    amountMicros: 5_000_000,
    originalCurrency: 'USD',
    originalAmount: 5,
    convertedAmount: 5,
    convertedCurrency: 'USD',
    amountDisplayString: '$5.00',
    messageText: 'Thanks!',
    stickerId: null,
    stickerAltText: null,
    tier: 1,
    receivedAt: '2026-03-30T12:00:00.000Z',
    state: 'unread',
    stateChangedAt: null,
    ...overrides
  }
}

afterEach(() => {
  useSuperchatStore.getState().clear()
  vi.restoreAllMocks()
})

describe('sortMessages', () => {
  const messages = [
    createMessage('older', {
      receivedAt: '2026-03-30T11:59:00.000Z',
      convertedAmount: 10
    }),
    createMessage('middle', {
      receivedAt: '2026-03-30T12:00:00.000Z',
      convertedAmount: 20
    }),
    createMessage('newer', {
      receivedAt: '2026-03-30T12:01:00.000Z',
      convertedAmount: 15
    })
  ]

  it.each<[SortOrder, string[]]>([
    ['latest', ['newer', 'middle', 'older']],
    ['oldest', ['older', 'middle', 'newer']],
    ['highest', ['middle', 'newer', 'older']]
  ])('sorts by %s', (sort, expected) => {
    expect(sortMessages(messages, sort).map((message) => message.id)).toEqual(expected)
  })
})

describe('computeStats', () => {
  it('computes totals, unread, saved, and sticker counts from the current message list', () => {
    const messages = [
      createMessage('one', { convertedAmount: 10 }),
      createMessage('two', { convertedAmount: 25, state: 'saved' }),
      createMessage('three', {
        convertedAmount: null,
        originalAmount: 7,
        state: 'read',
        type: 'super_sticker'
      })
    ]

    expect(computeStats(messages, 'USD')).toEqual({
      totalConverted: 42,
      unreadCount: 1,
      savedCount: 1,
      stickerCount: 1,
      messageCount: 3,
      averageDonation: 14,
      convertedCurrency: 'USD'
    })
  })
})

describe('hydrateSnapshot', () => {
  it('hydrates and sorts the restored session snapshot', () => {
    const snapshot: ActiveSessionSnapshot = {
      session: {
        id: 'session-1',
        youtubeBroadcastId: 'broadcast-1',
        liveChatId: 'chat-1',
        title: 'Morning Stream',
        startedAt: '2026-03-30T12:00:00.000Z',
        endedAt: null,
        status: 'active',
        totalConverted: 35,
        convertedCurrency: 'USD',
        messageCount: 2,
        stickerCount: 0,
        resumePageToken: 'cursor-1',
        lastPolledAt: '2026-03-30T12:02:00.000Z',
        lastError: null
      },
      messages: [
        createMessage('small', { convertedAmount: 5 }),
        createMessage('large', {
          convertedAmount: 30,
          receivedAt: '2026-03-30T12:03:00.000Z'
        })
      ],
      donors: [],
      stats: {
        ...EMPTY_STATS,
        totalConverted: 35,
        messageCount: 2,
        unreadCount: 2,
        averageDonation: 17.5,
        convertedCurrency: 'USD'
      }
    }

    useSuperchatStore.getState().hydrateSnapshot(snapshot, 'highest')

    const state = useSuperchatStore.getState()
    expect(state.sessionId).toBe('session-1')
    expect(state.sort).toBe('highest')
    expect(state.messages.map((message) => message.id)).toEqual(['large', 'small'])
    expect(state.stats.totalConverted).toBe(35)
  })

  it('clears state when there is no active snapshot', () => {
    useSuperchatStore.getState().hydrateSnapshot(null, 'latest')

    const state = useSuperchatStore.getState()
    expect(state.sessionId).toBeNull()
    expect(state.messages).toEqual([])
    expect(state.donors).toEqual([])
    expect(state.stats).toEqual(EMPTY_STATS)
  })
})

describe('setSort', () => {
  it('reorders the current message list without changing membership', () => {
    useSuperchatStore.setState({
      sessionId: 'session-1',
      messages: [
        createMessage('first', {
          receivedAt: '2026-03-30T12:00:00.000Z',
          convertedAmount: 10
        }),
        createMessage('second', {
          receivedAt: '2026-03-30T12:02:00.000Z',
          convertedAmount: 5
        }),
        createMessage('third', {
          receivedAt: '2026-03-30T12:01:00.000Z',
          convertedAmount: 25
        })
      ],
      donors: [],
      stats: EMPTY_STATS,
      sort: 'latest',
      undoEntry: null,
      loading: false
    })

    useSuperchatStore.getState().setSort('highest')

    const state = useSuperchatStore.getState()
    expect(state.sort).toBe('highest')
    expect(state.messages.map((message) => message.id)).toEqual(['third', 'first', 'second'])
  })
})

describe('addMessage', () => {
  it('uses original amount fallback when converted amount is unavailable', () => {
    useSuperchatStore.getState().addMessage(
      createMessage('fallback', {
        convertedAmount: null,
        convertedCurrency: null,
        originalAmount: 17,
        state: 'saved',
        type: 'super_sticker'
      })
    )

    const state = useSuperchatStore.getState()
    expect(state.stats.totalConverted).toBe(17)
    expect(state.stats.savedCount).toBe(1)
    expect(state.stats.stickerCount).toBe(1)
    expect(state.stats.unreadCount).toBe(0)
  })
})
