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
    listPaidMessages: (...args: unknown[]) => unknown[]
    listDonors: (...args: unknown[]) => unknown[]
    getSessionStats: (...args: unknown[]) => Record<string, unknown>
    updateMessageState: (...args: unknown[]) => unknown
    endSession: (...args: unknown[]) => Record<string, unknown> | null
    getSessionSummary: (...args: unknown[]) => Record<string, unknown> | null
    updateSessionResumeState: (...args: unknown[]) => void
    markSessionError: (...args: unknown[]) => Record<string, unknown> | null
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
