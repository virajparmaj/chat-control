import { afterEach, beforeEach, describe, expect, it } from 'vitest'

let DatabaseCtor: (new (path: string) => { close: () => void }) | null = null
let DatabaseQueriesCtor: (new (db: unknown) => unknown) | null = null
let initializeDatabase: ((db: unknown) => void) | null = null
let nativeDbUsable = false

try {
  const betterSqlite = await import('better-sqlite3')
  const queriesModule = await import('./queries')
  const schemaModule = await import('./schema')

  DatabaseCtor = betterSqlite.default as unknown as typeof DatabaseCtor
  DatabaseQueriesCtor = queriesModule.DatabaseQueries as unknown as typeof DatabaseQueriesCtor
  initializeDatabase = schemaModule.initializeDatabase as unknown as typeof initializeDatabase

  const probe = new DatabaseCtor!(':memory:')
  probe.close()
  nativeDbUsable = true
} catch {
  // Native better-sqlite3 is compiled for Electron in this workspace, so skip these tests in
  // plain Node-based Vitest runs until the suite is wired to an Electron-compatible runtime.
}

const describeWithNativeDb =
  DatabaseCtor && DatabaseQueriesCtor && initializeDatabase && nativeDbUsable
    ? describe
    : describe.skip

describeWithNativeDb('DatabaseQueries', () => {
  let db: { close: () => void }
  let queries: {
    createSession: (...args: unknown[]) => unknown
    getSession: (...args: unknown[]) => Record<string, unknown> | null
    ingestPaidMessage: (...args: unknown[]) => unknown
    listSessions: (...args: unknown[]) => unknown[]
    listPaidMessages: (...args: unknown[]) => unknown[]
    listSavedArchive: (...args: unknown[]) => unknown[]
    listDonors: (...args: unknown[]) => unknown[]
    listAllTimeDonors: (...args: unknown[]) => unknown[]
    getSessionStats: (...args: unknown[]) => Record<string, unknown>
    updateMessageState: (...args: unknown[]) => unknown
    clearSavedMessages: (...args: unknown[]) => unknown[]
    endSession: (...args: unknown[]) => Record<string, unknown> | null
    getSessionSummary: (...args: unknown[]) => Record<string, unknown> | null
    getSessionReport: (...args: unknown[]) => Record<string, unknown> | null
    updateSessionResumeState: (...args: unknown[]) => void
    markSessionError: (...args: unknown[]) => Record<string, unknown> | null
    getActiveSessionSnapshot: (...args: unknown[]) => Record<string, unknown> | null
    clearLocalData: () => void
    setPreference: (key: string, value: string) => void
    getPreference: (key: string) => string | null
  }

  beforeEach(() => {
    db = new DatabaseCtor!(':memory:')
    initializeDatabase!(db)
    queries = new DatabaseQueriesCtor!(db) as typeof queries
  })

  afterEach(() => {
    db?.close()
  })

  it('deduplicates paid messages while preserving donor aggregates and totals', () => {
    const session = queries.createSession({
      id: 'session-1',
      youtubeBroadcastId: 'broadcast-1',
      liveChatId: 'chat-1',
      title: 'Morning Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    const firstInsert = queries.ingestPaidMessage({
      id: 'message-1',
      youtubeMessageId: 'yt-message-1',
      sessionId: session.id,
      donorChannelId: 'donor-1',
      donorDisplayName: 'Donor One',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 5_000_000,
      originalCurrency: 'USD',
      originalAmount: 5,
      convertedAmount: 5,
      convertedCurrency: 'USD',
      amountDisplayString: '$5.00',
      messageText: 'First',
      stickerId: null,
      stickerAltText: null,
      tier: 1,
      receivedAt: '2026-03-30T12:00:00.000Z',
      rawPayload: '{}'
    }) as { youtubeMessageId: string } | null

    const duplicateInsert = queries.ingestPaidMessage({
      id: 'message-2',
      youtubeMessageId: 'yt-message-1',
      sessionId: session.id,
      donorChannelId: 'donor-1',
      donorDisplayName: 'Donor One',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 5_000_000,
      originalCurrency: 'USD',
      originalAmount: 5,
      convertedAmount: 5,
      convertedCurrency: 'USD',
      amountDisplayString: '$5.00',
      messageText: 'Duplicate',
      stickerId: null,
      stickerAltText: null,
      tier: 1,
      receivedAt: '2026-03-30T12:00:05.000Z',
      rawPayload: '{}'
    })

    const secondUniqueInsert = queries.ingestPaidMessage({
      id: 'message-3',
      youtubeMessageId: 'yt-message-2',
      sessionId: session.id,
      donorChannelId: 'donor-1',
      donorDisplayName: 'Donor One',
      donorAvatarUrl: null,
      type: 'super_sticker',
      amountMicros: 7_000_000,
      originalCurrency: 'EUR',
      originalAmount: 7,
      convertedAmount: null,
      convertedCurrency: null,
      amountDisplayString: 'EUR 7.00',
      messageText: null,
      stickerId: 'sticker-1',
      stickerAltText: 'Sparkle sticker',
      tier: 2,
      receivedAt: '2026-03-30T12:01:00.000Z',
      rawPayload: '{}'
    }) as { youtubeMessageId: string } | null

    const messages = queries.listPaidMessages(session.id)
    const donors = queries.listDonors(session.id) as Array<Record<string, unknown>>
    const stats = queries.getSessionStats(session.id)

    expect(firstInsert?.youtubeMessageId).toBe('yt-message-1')
    expect(duplicateInsert).toBeNull()
    expect(secondUniqueInsert?.youtubeMessageId).toBe('yt-message-2')
    expect(messages).toHaveLength(2)
    expect(donors[0]).toMatchObject({
      channelId: 'donor-1',
      totalConverted: 12,
      messageCount: 2
    })
    expect(stats).toMatchObject({
      totalConverted: 12,
      messageCount: 2,
      stickerCount: 1,
      unreadCount: 2,
      savedCount: 0,
      averageDonation: 6
    })
  })

  it('updates read and saved counts without changing donation totals', () => {
    const session = queries.createSession({
      id: 'session-2',
      youtubeBroadcastId: 'broadcast-2',
      liveChatId: 'chat-2',
      title: 'Evening Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    const first = queries.ingestPaidMessage({
      id: 'state-1',
      youtubeMessageId: 'state-yt-1',
      sessionId: session.id,
      donorChannelId: 'donor-a',
      donorDisplayName: 'Donor A',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 10_000_000,
      originalCurrency: 'USD',
      originalAmount: 10,
      convertedAmount: 10,
      convertedCurrency: 'USD',
      amountDisplayString: '$10.00',
      messageText: 'Nice stream',
      stickerId: null,
      stickerAltText: null,
      tier: 1,
      receivedAt: '2026-03-30T12:00:00.000Z',
      rawPayload: '{}'
    }) as { id: string }

    const second = queries.ingestPaidMessage({
      id: 'state-2',
      youtubeMessageId: 'state-yt-2',
      sessionId: session.id,
      donorChannelId: 'donor-b',
      donorDisplayName: 'Donor B',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 20_000_000,
      originalCurrency: 'USD',
      originalAmount: 20,
      convertedAmount: 20,
      convertedCurrency: 'USD',
      amountDisplayString: '$20.00',
      messageText: 'Another one',
      stickerId: null,
      stickerAltText: null,
      tier: 3,
      receivedAt: '2026-03-30T12:01:00.000Z',
      rawPayload: '{}'
    }) as { id: string }

    queries.updateMessageState(first.id, 'read')
    queries.updateMessageState(second.id, 'saved')

    expect(queries.getSessionStats(session.id)).toMatchObject({
      totalConverted: 30,
      unreadCount: 0,
      savedCount: 1,
      messageCount: 2
    })
  })

  it('lists saved items across sessions and sorts them by amount by default', () => {
    const currentSession = queries.createSession({
      id: 'session-saved-current',
      youtubeBroadcastId: 'broadcast-saved-current',
      liveChatId: 'chat-saved-current',
      title: 'Current Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    const endedSession = queries.createSession({
      id: 'session-saved-ended',
      youtubeBroadcastId: 'broadcast-saved-ended',
      liveChatId: 'chat-saved-ended',
      title: 'Ended Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    const lowerValue = queries.ingestPaidMessage({
      id: 'saved-current',
      youtubeMessageId: 'saved-current-yt',
      sessionId: currentSession.id,
      donorChannelId: 'current-donor',
      donorDisplayName: 'Current Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 25_000_000,
      originalCurrency: 'USD',
      originalAmount: 25,
      convertedAmount: 25,
      convertedCurrency: 'USD',
      amountDisplayString: '$25.00',
      messageText: 'Current message',
      stickerId: null,
      stickerAltText: null,
      tier: 2,
      receivedAt: '2026-03-30T12:01:00.000Z',
      rawPayload: '{}'
    }) as { id: string }

    const higherValue = queries.ingestPaidMessage({
      id: 'saved-ended',
      youtubeMessageId: 'saved-ended-yt',
      sessionId: endedSession.id,
      donorChannelId: 'ended-donor',
      donorDisplayName: 'Ended Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 50_000_000,
      originalCurrency: 'USD',
      originalAmount: 50,
      convertedAmount: 50,
      convertedCurrency: 'USD',
      amountDisplayString: '$50.00',
      messageText: 'Ended message',
      stickerId: null,
      stickerAltText: null,
      tier: 7,
      receivedAt: '2026-03-28T12:01:00.000Z',
      rawPayload: '{}'
    }) as { id: string }

    queries.updateMessageState(lowerValue.id, 'saved')
    queries.updateMessageState(higherValue.id, 'saved')
    queries.endSession(endedSession.id)

    const savedArchive = queries.listSavedArchive() as Array<Record<string, unknown>>

    expect(savedArchive).toHaveLength(2)
    expect(savedArchive[0]).toMatchObject({
      id: 'saved-ended',
      donorDisplayName: 'Ended Donor',
      sessionTitle: 'Ended Stream',
      sessionStatus: 'ended'
    })
    expect(savedArchive[1]).toMatchObject({
      id: 'saved-current',
      donorDisplayName: 'Current Donor',
      sessionTitle: 'Current Stream',
      sessionStatus: 'active'
    })
  })

  it('bulk clears saved items by moving them to read without deleting message history', () => {
    const session = queries.createSession({
      id: 'session-clear-saved',
      youtubeBroadcastId: 'broadcast-clear-saved',
      liveChatId: 'chat-clear-saved',
      title: 'Clear Saved Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    const savedMessage = queries.ingestPaidMessage({
      id: 'saved-clear-target',
      youtubeMessageId: 'saved-clear-target-yt',
      sessionId: session.id,
      donorChannelId: 'saved-clear-donor',
      donorDisplayName: 'Saved Clear Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 30_000_000,
      originalCurrency: 'USD',
      originalAmount: 30,
      convertedAmount: 30,
      convertedCurrency: 'USD',
      amountDisplayString: '$30.00',
      messageText: 'Keep this in history',
      stickerId: null,
      stickerAltText: null,
      tier: 3,
      receivedAt: '2026-03-30T12:00:00.000Z',
      rawPayload: '{}'
    }) as { id: string }

    queries.updateMessageState(savedMessage.id, 'saved')

    const cleared = queries.clearSavedMessages() as Array<Record<string, unknown>>

    expect(cleared).toHaveLength(1)
    expect(cleared[0]).toMatchObject({
      id: 'saved-clear-target',
      state: 'read'
    })
    expect(queries.getSessionStats(session.id)).toMatchObject({
      savedCount: 0,
      unreadCount: 0,
      messageCount: 1,
      totalConverted: 30
    })
    expect(
      (queries.listPaidMessages(session.id) as Array<Record<string, unknown>>)[0]
    ).toMatchObject({
      id: 'saved-clear-target',
      state: 'read'
    })
  })

  it('clears local sessions, messages, donors, and preferences together', () => {
    const session = queries.createSession({
      id: 'session-clear',
      youtubeBroadcastId: 'broadcast-clear',
      liveChatId: 'chat-clear',
      title: 'Cleanup Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    queries.ingestPaidMessage({
      id: 'clear-message-1',
      youtubeMessageId: 'clear-yt-1',
      sessionId: session.id,
      donorChannelId: 'clear-donor',
      donorDisplayName: 'Cleanup Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 15_000_000,
      originalCurrency: 'USD',
      originalAmount: 15,
      convertedAmount: 15,
      convertedCurrency: 'USD',
      amountDisplayString: '$15.00',
      messageText: 'Cleanup time',
      stickerId: null,
      stickerAltText: null,
      tier: 2,
      receivedAt: '2026-03-30T12:00:00.000Z',
      rawPayload: '{}'
    })
    queries.setPreference('app_preferences', '{"preferredCurrency":"EUR"}')

    queries.clearLocalData()

    expect(queries.listSessions()).toEqual([])
    expect(queries.listPaidMessages(session.id)).toEqual([])
    expect(queries.listDonors(session.id)).toEqual([])
    expect(queries.getPreference('app_preferences')).toBeNull()
    expect(queries.getActiveSessionSnapshot()).toBeNull()
  })

  it('builds a full session summary from stored session data', () => {
    const session = queries.createSession({
      id: 'session-3',
      youtubeBroadcastId: 'broadcast-3',
      liveChatId: 'chat-3',
      title: 'Summary Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    const first = queries.ingestPaidMessage({
      id: 'summary-1',
      youtubeMessageId: 'summary-yt-1',
      sessionId: session.id,
      donorChannelId: 'donor-1',
      donorDisplayName: 'Alpha',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 15_000_000,
      originalCurrency: 'USD',
      originalAmount: 15,
      convertedAmount: 15,
      convertedCurrency: 'USD',
      amountDisplayString: '$15.00',
      messageText: 'Alpha',
      stickerId: null,
      stickerAltText: null,
      tier: 2,
      receivedAt: '2026-03-30T12:00:00.000Z',
      rawPayload: '{}'
    }) as { id: string }

    queries.ingestPaidMessage({
      id: 'summary-2',
      youtubeMessageId: 'summary-yt-2',
      sessionId: session.id,
      donorChannelId: 'donor-2',
      donorDisplayName: 'Beta',
      donorAvatarUrl: null,
      type: 'super_sticker',
      amountMicros: 25_000_000,
      originalCurrency: 'USD',
      originalAmount: 25,
      convertedAmount: 25,
      convertedCurrency: 'USD',
      amountDisplayString: '$25.00',
      messageText: null,
      stickerId: 'sticker-2',
      stickerAltText: 'Heart sticker',
      tier: 4,
      receivedAt: '2026-03-30T12:01:00.000Z',
      rawPayload: '{}'
    })

    queries.updateMessageState(first.id, 'saved')
    queries.endSession(session.id)

    const summary = queries.getSessionSummary(session.id) as
      | (Record<string, unknown> & { topDonors: Array<Record<string, unknown>> })
      | null

    expect(summary).toMatchObject({
      id: session.id,
      status: 'ended',
      totalConverted: 40,
      messageCount: 2,
      stickerCount: 1,
      savedCount: 1,
      averageDonation: 20
    })
    expect(summary?.highestDonor).toMatchObject({
      channelId: 'donor-2',
      totalConverted: 25
    })
    expect(summary?.topDonors.map((donor: Record<string, unknown>) => donor.displayName)).toEqual([
      'Beta',
      'Alpha'
    ])
    expect(summary?.endedAt).not.toBeNull()
  })

  it('aggregates all-time donor totals across local sessions', () => {
    const firstSession = queries.createSession({
      id: 'session-all-time-1',
      youtubeBroadcastId: 'broadcast-all-time-1',
      liveChatId: 'chat-all-time-1',
      title: 'All Time One',
      convertedCurrency: 'USD'
    }) as { id: string }

    const secondSession = queries.createSession({
      id: 'session-all-time-2',
      youtubeBroadcastId: 'broadcast-all-time-2',
      liveChatId: 'chat-all-time-2',
      title: 'All Time Two',
      convertedCurrency: 'USD'
    }) as { id: string }

    queries.ingestPaidMessage({
      id: 'all-time-1',
      youtubeMessageId: 'all-time-yt-1',
      sessionId: firstSession.id,
      donorChannelId: 'repeat-donor',
      donorDisplayName: 'Repeat Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 45_000_000,
      originalCurrency: 'USD',
      originalAmount: 45,
      convertedAmount: 45,
      convertedCurrency: 'USD',
      amountDisplayString: '$45.00',
      messageText: 'First stream support',
      stickerId: null,
      stickerAltText: null,
      tier: 3,
      receivedAt: '2026-03-25T12:00:00.000Z',
      rawPayload: '{}'
    })

    queries.ingestPaidMessage({
      id: 'all-time-2',
      youtubeMessageId: 'all-time-yt-2',
      sessionId: secondSession.id,
      donorChannelId: 'repeat-donor',
      donorDisplayName: 'Repeat Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 55_000_000,
      originalCurrency: 'USD',
      originalAmount: 55,
      convertedAmount: 55,
      convertedCurrency: 'USD',
      amountDisplayString: '$55.00',
      messageText: 'Second stream support',
      stickerId: null,
      stickerAltText: null,
      tier: 5,
      receivedAt: '2026-03-30T12:00:00.000Z',
      rawPayload: '{}'
    })

    queries.ingestPaidMessage({
      id: 'all-time-3',
      youtubeMessageId: 'all-time-yt-3',
      sessionId: secondSession.id,
      donorChannelId: 'fresh-donor',
      donorDisplayName: 'Fresh Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 25_000_000,
      originalCurrency: 'USD',
      originalAmount: 25,
      convertedAmount: 25,
      convertedCurrency: 'USD',
      amountDisplayString: '$25.00',
      messageText: 'Fresh support',
      stickerId: null,
      stickerAltText: null,
      tier: 2,
      receivedAt: '2026-03-30T12:05:00.000Z',
      rawPayload: '{}'
    })

    const donors = queries.listAllTimeDonors() as Array<Record<string, unknown>>

    expect(donors).toHaveLength(2)
    expect(donors[0]).toMatchObject({
      channelId: 'repeat-donor',
      displayName: 'Repeat Donor',
      totalConverted: 100,
      messageCount: 2
    })
    expect(donors[1]).toMatchObject({
      channelId: 'fresh-donor',
      displayName: 'Fresh Donor',
      totalConverted: 25,
      messageCount: 1
    })
  })

  it('derives the richer session report analytics for history detail screens', () => {
    const previousSession = queries.createSession({
      id: 'session-prev',
      youtubeBroadcastId: 'broadcast-prev',
      liveChatId: 'chat-prev',
      title: 'Previous Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    queries.ingestPaidMessage({
      id: 'previous-1',
      youtubeMessageId: 'previous-yt-1',
      sessionId: previousSession.id,
      donorChannelId: 'repeat-donor',
      donorDisplayName: 'Repeat Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 20_000_000,
      originalCurrency: 'USD',
      originalAmount: 20,
      convertedAmount: 20,
      convertedCurrency: 'USD',
      amountDisplayString: '$20.00',
      messageText: 'Previous support',
      stickerId: null,
      stickerAltText: null,
      tier: 2,
      receivedAt: '2026-03-29T10:00:00.000Z',
      rawPayload: '{}'
    })
    queries.endSession(previousSession.id)
    ;(db as unknown as { prepare: (sql: string) => { run: (...args: unknown[]) => void } })
      .prepare('UPDATE sessions SET started_at = ?, ended_at = ?, status = ? WHERE id = ?')
      .run('2026-03-29T09:00:00.000Z', '2026-03-29T10:00:00.000Z', 'ended', previousSession.id)

    const currentSession = queries.createSession({
      id: 'session-report',
      youtubeBroadcastId: 'broadcast-report',
      liveChatId: 'chat-report',
      title: 'Report Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    queries.ingestPaidMessage({
      id: 'report-1',
      youtubeMessageId: 'report-yt-1',
      sessionId: currentSession.id,
      donorChannelId: 'repeat-donor',
      donorDisplayName: 'Repeat Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 15_000_000,
      originalCurrency: 'USD',
      originalAmount: 15,
      convertedAmount: 15,
      convertedCurrency: 'USD',
      amountDisplayString: '$15.00',
      messageText: 'Back again',
      stickerId: null,
      stickerAltText: null,
      tier: 2,
      receivedAt: '2026-03-30T12:00:00.000Z',
      rawPayload: '{}'
    })
    queries.ingestPaidMessage({
      id: 'report-2',
      youtubeMessageId: 'report-yt-2',
      sessionId: currentSession.id,
      donorChannelId: 'new-big',
      donorDisplayName: 'New Big Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 125_000_000,
      originalCurrency: 'USD',
      originalAmount: 125,
      convertedAmount: 125,
      convertedCurrency: 'USD',
      amountDisplayString: '$125.00',
      messageText: 'Huge support',
      stickerId: null,
      stickerAltText: null,
      tier: 5,
      receivedAt: '2026-03-30T12:10:00.000Z',
      rawPayload: '{}'
    })
    queries.ingestPaidMessage({
      id: 'report-3',
      youtubeMessageId: 'report-yt-3',
      sessionId: currentSession.id,
      donorChannelId: 'repeat-donor',
      donorDisplayName: 'Repeat Donor',
      donorAvatarUrl: null,
      type: 'super_sticker',
      amountMicros: 55_000_000,
      originalCurrency: 'USD',
      originalAmount: 55,
      convertedAmount: 55,
      convertedCurrency: 'USD',
      amountDisplayString: '$55.00',
      messageText: null,
      stickerId: 'sparkle',
      stickerAltText: 'Sparkle',
      tier: 3,
      receivedAt: '2026-03-30T12:20:00.000Z',
      rawPayload: '{}'
    })
    queries.ingestPaidMessage({
      id: 'report-4',
      youtubeMessageId: 'report-yt-4',
      sessionId: currentSession.id,
      donorChannelId: 'new-small',
      donorDisplayName: 'New Small Donor',
      donorAvatarUrl: null,
      type: 'super_chat',
      amountMicros: 8_000_000,
      originalCurrency: 'USD',
      originalAmount: 8,
      convertedAmount: 8,
      convertedCurrency: 'USD',
      amountDisplayString: '$8.00',
      messageText: 'Small but mighty',
      stickerId: null,
      stickerAltText: null,
      tier: 1,
      receivedAt: '2026-03-30T13:05:00.000Z',
      rawPayload: '{}'
    })
    queries.endSession(currentSession.id)
    ;(db as unknown as { prepare: (sql: string) => { run: (...args: unknown[]) => void } })
      .prepare('UPDATE sessions SET started_at = ?, ended_at = ?, status = ? WHERE id = ?')
      .run('2026-03-30T12:00:00.000Z', '2026-03-30T13:05:00.000Z', 'ended', currentSession.id)

    const report = queries.getSessionReport(currentSession.id) as
      | (Record<string, unknown> & {
          topSupporters: Array<Record<string, unknown>>
          amountBuckets: Record<string, unknown>
          typeBreakdown: Record<string, Record<string, unknown>>
          comparisonToPrevious: Record<string, unknown> | null
          highestSingleDonation: Record<string, unknown> | null
          peakDonationWindow: Record<string, unknown> | null
        })
      | null

    expect(report).not.toBeNull()
    expect(report).toMatchObject({
      durationMinutes: 65,
      uniqueDonors: 3,
      repeatDonors: 1,
      newSupporters: 2
    })
    expect(report?.amountBuckets).toMatchObject({
      underTwenty: 2,
      twentyToFortyNine: 0,
      fiftyToNinetyNine: 1,
      hundredPlus: 1
    })
    expect(report?.typeBreakdown.superChats).toMatchObject({
      count: 3,
      totalConverted: 148
    })
    expect(report?.typeBreakdown.superStickers).toMatchObject({
      count: 1,
      totalConverted: 55
    })
    expect(report?.highestSingleDonation).toMatchObject({
      donorDisplayName: 'New Big Donor',
      amount: 125
    })
    expect(report?.peakDonationWindow).toMatchObject({
      totalConverted: 195,
      messageCount: 3
    })
    expect(report?.comparisonToPrevious).toMatchObject({
      previousSessionId: 'session-prev',
      totalRaisedDelta: 183,
      superChatsDelta: 2,
      uniqueDonorsDelta: 2
    })
    expect(report?.topSupporters[0]).toMatchObject({
      displayName: 'Repeat Donor',
      totalConverted: 70
    })
    expect(report?.messagesPerHour).toBeCloseTo(3.69, 2)
  })

  it('distinguishes ended sessions from errored sessions during finalization', () => {
    const endedSession = queries.createSession({
      id: 'ended-session',
      youtubeBroadcastId: 'broadcast-4',
      liveChatId: 'chat-4',
      title: 'Ended Stream',
      convertedCurrency: 'USD'
    }) as { id: string }
    const erroredSession = queries.createSession({
      id: 'errored-session',
      youtubeBroadcastId: 'broadcast-5',
      liveChatId: 'chat-5',
      title: 'Errored Stream',
      convertedCurrency: 'USD'
    }) as { id: string }

    queries.updateSessionResumeState(
      endedSession.id,
      'cursor-ended',
      '2026-03-30T12:02:00.000Z',
      null
    )
    queries.updateSessionResumeState(
      erroredSession.id,
      'cursor-error',
      '2026-03-30T12:03:00.000Z',
      'transient error'
    )

    const ended = queries.endSession(endedSession.id)
    const errored = queries.markSessionError(erroredSession.id, 'Authentication expired')

    expect(ended).toMatchObject({
      id: endedSession.id,
      status: 'ended',
      resumePageToken: null,
      lastError: null
    })
    expect(errored).toMatchObject({
      id: erroredSession.id,
      status: 'error',
      resumePageToken: null,
      lastError: 'Authentication expired'
    })
  })

  it('persists explicit source modes and maps legacy null rows to creator_broadcast', () => {
    const publicSession = queries.createSession({
      id: 'public-session',
      youtubeBroadcastId: 'public12345a',
      liveChatId: 'public-chat-1',
      title: 'Public Stream',
      sourceMode: 'public_video',
      convertedCurrency: 'USD'
    }) as Record<string, unknown>

    ;(
      db as unknown as {
        prepare: (sql: string) => { run: (...args: unknown[]) => void }
      }
    )
      .prepare(
        `INSERT INTO sessions (
          id,
          youtube_broadcast_id,
          live_chat_id,
          title,
          started_at,
          status,
          converted_currency,
          resume_page_token,
          last_polled_at,
          last_error
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, NULL, NULL, NULL)`
      )
      .run(
        'legacy-session',
        'broadcast-legacy',
        'chat-legacy',
        'Legacy Stream',
        '2026-03-30T12:00:00.000Z',
        'USD'
      )

    const legacySession = queries.getSession('legacy-session')

    expect(publicSession).toMatchObject({
      id: 'public-session',
      sourceMode: 'public_video'
    })
    expect(legacySession).toMatchObject({
      id: 'legacy-session',
      sourceMode: 'creator_broadcast'
    })
  })
})
