import Database from 'better-sqlite3'
import type {
  ActiveSessionSnapshot,
  DonorAggregate,
  LeaderboardDonorAggregate,
  PaidMessage,
  PaidMessageState,
  SavedArchiveItem,
  SessionReport,
  SessionStats,
  SessionSummary,
  SortOrder,
  StreamSourceMode,
  StreamSession
} from '../../shared/ipc-types'

interface SessionRow {
  id: string
  youtube_broadcast_id: string
  live_chat_id: string | null
  title: string | null
  source_mode: string | null
  started_at: string
  ended_at: string | null
  status: string
  total_converted: number
  converted_currency: string | null
  message_count: number
  sticker_count: number
  resume_page_token: string | null
  last_polled_at: string | null
  last_error: string | null
}

interface PaidMessageRow {
  id: string
  youtube_message_id: string
  session_id: string
  donor_channel_id: string
  donor_display_name: string
  donor_avatar_url: string | null
  type: string
  amount_micros: number
  original_currency: string
  original_amount: number
  converted_amount: number | null
  converted_currency: string | null
  amount_display_string: string | null
  message_text: string | null
  sticker_id: string | null
  sticker_alt_text: string | null
  tier: number
  received_at: string
  state: string
  state_changed_at: string | null
  raw_payload: string | null
}

interface DonorRow {
  channel_id: string
  session_id: string
  display_name: string
  avatar_url: string | null
  total_converted: number
  message_count: number
  first_seen_at: string
  last_seen_at: string
}

interface LeaderboardDonorRow {
  channel_id: string
  display_name: string
  avatar_url: string | null
  total_converted: number
  message_count: number
  first_seen_at: string
  last_seen_at: string
}

interface SavedArchiveRow extends PaidMessageRow {
  session_title: string | null
  session_status: string
  session_started_at: string
  session_ended_at: string | null
}

function normalizeSourceMode(value: string | null): StreamSourceMode {
  return value === 'public_video' ? 'public_video' : 'creator_broadcast'
}

function toSession(row: SessionRow): StreamSession {
  return {
    id: row.id,
    youtubeBroadcastId: row.youtube_broadcast_id,
    liveChatId: row.live_chat_id,
    title: row.title,
    sourceMode: normalizeSourceMode(row.source_mode),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status as StreamSession['status'],
    totalConverted: row.total_converted,
    convertedCurrency: row.converted_currency,
    messageCount: row.message_count,
    stickerCount: row.sticker_count,
    resumePageToken: row.resume_page_token,
    lastPolledAt: row.last_polled_at,
    lastError: row.last_error
  }
}

function toPaidMessage(row: PaidMessageRow): PaidMessage {
  return {
    id: row.id,
    youtubeMessageId: row.youtube_message_id,
    sessionId: row.session_id,
    donorChannelId: row.donor_channel_id,
    donorDisplayName: row.donor_display_name,
    donorAvatarUrl: row.donor_avatar_url,
    type: row.type as PaidMessage['type'],
    amountMicros: row.amount_micros,
    originalCurrency: row.original_currency,
    originalAmount: row.original_amount,
    convertedAmount: row.converted_amount,
    convertedCurrency: row.converted_currency,
    amountDisplayString: row.amount_display_string,
    messageText: row.message_text,
    stickerId: row.sticker_id,
    stickerAltText: row.sticker_alt_text,
    tier: row.tier,
    receivedAt: row.received_at,
    state: row.state as PaidMessage['state'],
    stateChangedAt: row.state_changed_at
  }
}

function toDonor(row: DonorRow): DonorAggregate {
  return {
    channelId: row.channel_id,
    sessionId: row.session_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalConverted: row.total_converted,
    messageCount: row.message_count,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at
  }
}

function toLeaderboardDonor(row: LeaderboardDonorRow): LeaderboardDonorAggregate {
  return {
    channelId: row.channel_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalConverted: row.total_converted,
    messageCount: row.message_count,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at
  }
}

function toSavedArchiveItem(row: SavedArchiveRow): SavedArchiveItem {
  return {
    ...toPaidMessage(row),
    sessionTitle: row.session_title,
    sessionStatus: row.session_status as SavedArchiveItem['sessionStatus'],
    sessionStartedAt: row.session_started_at,
    sessionEndedAt: row.session_ended_at
  }
}

function getMessageAmount(
  message: Pick<PaidMessage, 'convertedAmount' | 'originalAmount'>
): number {
  return message.convertedAmount ?? message.originalAmount
}

function getDurationMinutes(startedAt: string, endedAt: string | null): number {
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt ?? new Date().toISOString()).getTime()
  const diff = Math.max(end - start, 60_000)
  return Math.max(1, Math.round(diff / 60_000))
}

function countUniqueDonors(messages: PaidMessage[]): number {
  return new Set(messages.map((message) => message.donorChannelId)).size
}

function computeAmountBuckets(messages: PaidMessage[]): SessionReport['amountBuckets'] {
  const buckets = {
    underTwenty: 0,
    twentyToFortyNine: 0,
    fiftyToNinetyNine: 0,
    hundredPlus: 0
  }

  for (const message of messages) {
    const amount = getMessageAmount(message)
    if (amount >= 100) {
      buckets.hundredPlus += 1
    } else if (amount >= 50) {
      buckets.fiftyToNinetyNine += 1
    } else if (amount >= 20) {
      buckets.twentyToFortyNine += 1
    } else {
      buckets.underTwenty += 1
    }
  }

  return buckets
}

function computeTypeBreakdown(messages: PaidMessage[]): SessionReport['typeBreakdown'] {
  const breakdown: SessionReport['typeBreakdown'] = {
    superChats: { count: 0, totalConverted: 0 },
    superStickers: { count: 0, totalConverted: 0 }
  }

  for (const message of messages) {
    const target = message.type === 'super_sticker' ? breakdown.superStickers : breakdown.superChats
    target.count += 1
    target.totalConverted += getMessageAmount(message)
  }

  return breakdown
}

function computeHighestSingleDonation(
  messages: PaidMessage[],
  defaultCurrency: string
): SessionReport['highestSingleDonation'] {
  const highest = messages.reduce<PaidMessage | null>((currentHighest, message) => {
    if (!currentHighest) return message
    return getMessageAmount(message) > getMessageAmount(currentHighest) ? message : currentHighest
  }, null)

  if (!highest) return null

  return {
    messageId: highest.id,
    donorChannelId: highest.donorChannelId,
    donorDisplayName: highest.donorDisplayName,
    donorAvatarUrl: highest.donorAvatarUrl,
    amount: getMessageAmount(highest),
    currency: highest.convertedCurrency ?? highest.originalCurrency ?? defaultCurrency,
    receivedAt: highest.receivedAt,
    type: highest.type
  }
}

function computePeakDonationWindow(messages: PaidMessage[]): SessionReport['peakDonationWindow'] {
  if (messages.length === 0) return null

  const windowMs = 30 * 60 * 1000
  let startIndex = 0
  let rollingTotal = 0
  let bestTotal = -1
  let bestStartIndex = 0
  let bestEndIndex = 0

  for (let endIndex = 0; endIndex < messages.length; endIndex += 1) {
    rollingTotal += getMessageAmount(messages[endIndex])

    while (
      new Date(messages[endIndex].receivedAt).getTime() -
        new Date(messages[startIndex].receivedAt).getTime() >
      windowMs
    ) {
      rollingTotal -= getMessageAmount(messages[startIndex])
      startIndex += 1
    }

    if (rollingTotal > bestTotal) {
      bestTotal = rollingTotal
      bestStartIndex = startIndex
      bestEndIndex = endIndex
    }
  }

  return {
    startAt: messages[bestStartIndex].receivedAt,
    endAt: messages[bestEndIndex].receivedAt,
    totalConverted: bestTotal,
    messageCount: bestEndIndex - bestStartIndex + 1
  }
}

export class DatabaseQueries {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  createSession(session: {
    id: string
    youtubeBroadcastId: string
    liveChatId: string | null
    title: string | null
    sourceMode?: StreamSourceMode | null
    convertedCurrency: string | null
  }): StreamSession {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO sessions (
          id,
          youtube_broadcast_id,
          live_chat_id,
          title,
          source_mode,
          started_at,
          status,
          converted_currency,
          resume_page_token,
          last_polled_at,
          last_error
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, NULL, NULL, NULL)`
      )
      .run(
        session.id,
        session.youtubeBroadcastId,
        session.liveChatId,
        session.title,
        session.sourceMode ?? null,
        now,
        session.convertedCurrency
      )

    return this.getSession(session.id)!
  }

  getSession(id: string): StreamSession | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
      | SessionRow
      | undefined

    return row ? toSession(row) : null
  }

  getActiveSession(): StreamSession | null {
    const row = this.db
      .prepare("SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1")
      .get() as SessionRow | undefined

    return row ? toSession(row) : null
  }

  listActiveSessions(): StreamSession[] {
    const rows = this.db
      .prepare("SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC")
      .all() as SessionRow[]

    return rows.map(toSession)
  }

  endSession(id: string): StreamSession | null {
    const now = new Date().toISOString()
    this.db
      .prepare(
        "UPDATE sessions SET ended_at = ?, status = 'ended', resume_page_token = NULL, last_error = NULL WHERE id = ?"
      )
      .run(now, id)

    return this.getSession(id)
  }

  markSessionError(id: string, error: string): StreamSession | null {
    const now = new Date().toISOString()
    this.db
      .prepare(
        "UPDATE sessions SET ended_at = COALESCE(ended_at, ?), status = 'error', last_error = ?, resume_page_token = NULL WHERE id = ?"
      )
      .run(now, error, id)

    return this.getSession(id)
  }

  clearSessionError(id: string): void {
    this.db.prepare('UPDATE sessions SET last_error = NULL WHERE id = ?').run(id)
  }

  updateSessionResumeState(
    sessionId: string,
    resumePageToken: string | null,
    lastPolledAt: string,
    lastError: string | null = null
  ): void {
    this.db
      .prepare(
        'UPDATE sessions SET resume_page_token = ?, last_polled_at = ?, last_error = ? WHERE id = ?'
      )
      .run(resumePageToken, lastPolledAt, lastError, sessionId)
  }

  updateSessionTotals(
    sessionId: string,
    totalConverted: number,
    messageCount: number,
    stickerCount: number
  ): void {
    this.db
      .prepare(
        'UPDATE sessions SET total_converted = ?, message_count = ?, sticker_count = ? WHERE id = ?'
      )
      .run(totalConverted, messageCount, stickerCount, sessionId)
  }

  listSessions(): StreamSession[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions ORDER BY started_at DESC')
      .all() as SessionRow[]

    return rows.map(toSession)
  }

  insertPaidMessage(msg: {
    id: string
    youtubeMessageId: string
    sessionId: string
    donorChannelId: string
    donorDisplayName: string
    donorAvatarUrl: string | null
    type: string
    amountMicros: number
    originalCurrency: string
    originalAmount: number
    convertedAmount: number | null
    convertedCurrency: string | null
    amountDisplayString: string | null
    messageText: string | null
    stickerId: string | null
    stickerAltText: string | null
    tier: number
    receivedAt: string
    rawPayload: string | null
  }): PaidMessage | null {
    try {
      this.db
        .prepare(
          `INSERT INTO paid_messages (
            id,
            youtube_message_id,
            session_id,
            donor_channel_id,
            donor_display_name,
            donor_avatar_url,
            type,
            amount_micros,
            original_currency,
            original_amount,
            converted_amount,
            converted_currency,
            amount_display_string,
            message_text,
            sticker_id,
            sticker_alt_text,
            tier,
            received_at,
            state,
            raw_payload
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?)`
        )
        .run(
          msg.id,
          msg.youtubeMessageId,
          msg.sessionId,
          msg.donorChannelId,
          msg.donorDisplayName,
          msg.donorAvatarUrl,
          msg.type,
          msg.amountMicros,
          msg.originalCurrency,
          msg.originalAmount,
          msg.convertedAmount,
          msg.convertedCurrency,
          msg.amountDisplayString,
          msg.messageText,
          msg.stickerId,
          msg.stickerAltText,
          msg.tier,
          msg.receivedAt,
          msg.rawPayload
        )

      return this.getPaidMessage(msg.id)
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        return null
      }

      throw error
    }
  }

  ingestPaidMessage(message: {
    id: string
    youtubeMessageId: string
    sessionId: string
    donorChannelId: string
    donorDisplayName: string
    donorAvatarUrl: string | null
    type: string
    amountMicros: number
    originalCurrency: string
    originalAmount: number
    convertedAmount: number | null
    convertedCurrency: string | null
    amountDisplayString: string | null
    messageText: string | null
    stickerId: string | null
    stickerAltText: string | null
    tier: number
    receivedAt: string
    rawPayload: string | null
  }): PaidMessage | null {
    const ingest = this.db.transaction(() => {
      const inserted = this.insertPaidMessage(message)
      if (!inserted) return null

      this.upsertDonor({
        channelId: message.donorChannelId,
        sessionId: message.sessionId,
        displayName: message.donorDisplayName,
        avatarUrl: message.donorAvatarUrl,
        convertedAmount: message.convertedAmount ?? message.originalAmount,
        receivedAt: message.receivedAt
      })

      const stats = this.getSessionStats(message.sessionId)
      this.updateSessionTotals(
        message.sessionId,
        stats.totalConverted,
        stats.messageCount,
        stats.stickerCount
      )

      return inserted
    })

    return ingest()
  }

  getPaidMessage(id: string): PaidMessage | null {
    const row = this.db.prepare('SELECT * FROM paid_messages WHERE id = ?').get(id) as
      | PaidMessageRow
      | undefined

    return row ? toPaidMessage(row) : null
  }

  listPaidMessages(
    sessionId: string,
    state?: PaidMessageState,
    sort: SortOrder = 'latest'
  ): PaidMessage[] {
    const orderClause =
      sort === 'highest'
        ? 'COALESCE(converted_amount, original_amount) DESC, received_at DESC'
        : sort === 'oldest'
          ? 'received_at ASC'
          : 'received_at DESC'

    let query = 'SELECT * FROM paid_messages WHERE session_id = ?'
    const params: (string | undefined)[] = [sessionId]

    if (state) {
      query += ' AND state = ?'
      params.push(state)
    }

    query += ` ORDER BY ${orderClause}`

    const rows = this.db.prepare(query).all(...params) as PaidMessageRow[]
    return rows.map(toPaidMessage)
  }

  listSavedArchive(sort: SortOrder = 'highest'): SavedArchiveItem[] {
    const orderClause =
      sort === 'highest'
        ? 'COALESCE(m.converted_amount, m.original_amount) DESC, m.received_at DESC'
        : sort === 'oldest'
          ? 'm.received_at ASC'
          : 'm.received_at DESC'

    const rows = this.db
      .prepare(
        `SELECT
          m.*,
          s.title as session_title,
          s.status as session_status,
          s.started_at as session_started_at,
          s.ended_at as session_ended_at
        FROM paid_messages m
        INNER JOIN sessions s ON s.id = m.session_id
        WHERE m.state = 'saved'
        ORDER BY ${orderClause}`
      )
      .all() as SavedArchiveRow[]

    return rows.map(toSavedArchiveItem)
  }

  updateMessageState(id: string, state: PaidMessageState): PaidMessage | null {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE paid_messages SET state = ?, state_changed_at = ? WHERE id = ?')
      .run(state, now, id)

    return this.getPaidMessage(id)
  }

  markAllMessagesRead(sessionId: string): PaidMessage[] {
    const unreadRows = this.db
      .prepare("SELECT id FROM paid_messages WHERE session_id = ? AND state = 'unread'")
      .all(sessionId) as Array<{ id: string }>

    if (unreadRows.length === 0) return []

    const now = new Date().toISOString()
    const update = this.db.prepare(
      "UPDATE paid_messages SET state = 'read', state_changed_at = ? WHERE id = ?"
    )

    const transaction = this.db.transaction((rows: Array<{ id: string }>) => {
      for (const row of rows) {
        update.run(now, row.id)
      }
    })

    transaction(unreadRows)

    return unreadRows
      .map((row) => this.getPaidMessage(row.id))
      .filter((message): message is PaidMessage => message !== null)
  }

  clearSavedMessages(): PaidMessage[] {
    const savedRows = this.db
      .prepare("SELECT id FROM paid_messages WHERE state = 'saved'")
      .all() as Array<{ id: string }>

    if (savedRows.length === 0) return []

    const now = new Date().toISOString()
    const update = this.db.prepare(
      "UPDATE paid_messages SET state = 'read', state_changed_at = ? WHERE id = ?"
    )

    const transaction = this.db.transaction((rows: Array<{ id: string }>) => {
      for (const row of rows) {
        update.run(now, row.id)
      }
    })

    transaction(savedRows)

    return savedRows
      .map((row) => this.getPaidMessage(row.id))
      .filter((message): message is PaidMessage => message !== null)
  }

  getSessionStats(sessionId: string): SessionStats {
    const row = this.db
      .prepare(
        `SELECT
          COALESCE(SUM(COALESCE(converted_amount, original_amount)), 0) as total,
          COUNT(*) as total_count,
          COALESCE(SUM(CASE WHEN type = 'super_sticker' THEN 1 ELSE 0 END), 0) as sticker_count,
          COALESCE(SUM(CASE WHEN state = 'unread' THEN 1 ELSE 0 END), 0) as unread_count,
          COALESCE(SUM(CASE WHEN state = 'saved' THEN 1 ELSE 0 END), 0) as saved_count
        FROM paid_messages
        WHERE session_id = ?`
      )
      .get(sessionId) as {
      total: number
      total_count: number
      sticker_count: number
      unread_count: number
      saved_count: number
    }

    const session = this.getSession(sessionId)

    return {
      totalConverted: row.total,
      messageCount: row.total_count,
      stickerCount: row.sticker_count,
      unreadCount: row.unread_count,
      savedCount: row.saved_count,
      averageDonation: row.total_count > 0 ? row.total / row.total_count : 0,
      convertedCurrency: session?.convertedCurrency ?? null
    }
  }

  upsertDonor(donor: {
    channelId: string
    sessionId: string
    displayName: string
    avatarUrl: string | null
    convertedAmount: number
    receivedAt: string
  }): void {
    this.db
      .prepare(
        `INSERT INTO donors (
          channel_id,
          session_id,
          display_name,
          avatar_url,
          total_converted,
          message_count,
          first_seen_at,
          last_seen_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(channel_id, session_id) DO UPDATE SET
          display_name = excluded.display_name,
          avatar_url = COALESCE(excluded.avatar_url, donors.avatar_url),
          total_converted = donors.total_converted + excluded.total_converted,
          message_count = donors.message_count + 1,
          last_seen_at = excluded.last_seen_at`
      )
      .run(
        donor.channelId,
        donor.sessionId,
        donor.displayName,
        donor.avatarUrl,
        donor.convertedAmount,
        donor.receivedAt,
        donor.receivedAt
      )
  }

  listDonors(sessionId: string): DonorAggregate[] {
    const rows = this.db
      .prepare('SELECT * FROM donors WHERE session_id = ? ORDER BY total_converted DESC')
      .all(sessionId) as DonorRow[]

    return rows.map(toDonor)
  }

  listAllTimeDonors(): LeaderboardDonorAggregate[] {
    const rows = this.db
      .prepare(
        `WITH donor_rollup AS (
          SELECT
            channel_id,
            SUM(total_converted) AS total_converted,
            SUM(message_count) AS message_count,
            MIN(first_seen_at) AS first_seen_at,
            MAX(last_seen_at) AS last_seen_at
          FROM donors
          GROUP BY channel_id
        ),
        donor_profile AS (
          SELECT
            channel_id,
            display_name,
            avatar_url,
            last_seen_at,
            ROW_NUMBER() OVER (
              PARTITION BY channel_id
              ORDER BY last_seen_at DESC, first_seen_at DESC, session_id DESC
            ) AS row_number
          FROM donors
        )
        SELECT
          donor_rollup.channel_id,
          donor_profile.display_name,
          donor_profile.avatar_url,
          donor_rollup.total_converted,
          donor_rollup.message_count,
          donor_rollup.first_seen_at,
          donor_rollup.last_seen_at
        FROM donor_rollup
        JOIN donor_profile
          ON donor_profile.channel_id = donor_rollup.channel_id
         AND donor_profile.row_number = 1
        ORDER BY
          donor_rollup.total_converted DESC,
          donor_rollup.message_count DESC,
          donor_rollup.last_seen_at DESC,
          donor_profile.display_name COLLATE NOCASE ASC,
          donor_rollup.channel_id COLLATE NOCASE ASC`
      )
      .all() as LeaderboardDonorRow[]

    return rows.map(toLeaderboardDonor)
  }

  getTopDonor(sessionId: string): DonorAggregate | null {
    const row = this.db
      .prepare('SELECT * FROM donors WHERE session_id = ? ORDER BY total_converted DESC LIMIT 1')
      .get(sessionId) as DonorRow | undefined

    return row ? toDonor(row) : null
  }

  getPreference(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM preferences WHERE key = ?').get(key) as
      | { value: string }
      | undefined

    return row?.value ?? null
  }

  setPreference(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)').run(key, value)
  }

  clearLocalData(): void {
    const clear = this.db.transaction(() => {
      this.db.prepare('DELETE FROM paid_messages').run()
      this.db.prepare('DELETE FROM donors').run()
      this.db.prepare('DELETE FROM sessions').run()
      this.db.prepare('DELETE FROM preferences').run()
    })

    clear()
  }

  getActiveSessionSnapshot(sort: SortOrder = 'latest'): ActiveSessionSnapshot | null {
    const session = this.getActiveSession()
    if (!session) return null

    return {
      session,
      messages: this.listPaidMessages(session.id, undefined, sort),
      donors: this.listDonors(session.id),
      stats: this.getSessionStats(session.id)
    }
  }

  getSessionSummary(sessionId: string): SessionSummary | null {
    const session = this.getSession(sessionId)
    if (!session) return null

    const stats = this.getSessionStats(sessionId)
    const topDonors = this.listDonors(sessionId)
    const highestDonor = topDonors[0] ?? null

    return {
      ...session,
      totalConverted: stats.totalConverted,
      messageCount: stats.messageCount,
      stickerCount: stats.stickerCount,
      highestDonor,
      topDonors,
      savedCount: stats.savedCount,
      averageDonation: stats.averageDonation
    }
  }

  getSessionReport(sessionId: string): SessionReport | null {
    const summary = this.getSessionSummary(sessionId)
    if (!summary) return null

    const messages = this.listPaidMessages(sessionId, undefined, 'oldest')
    const topSupporters = this.listDonors(sessionId)
    const uniqueDonors = countUniqueDonors(messages)
    const durationMinutes = getDurationMinutes(summary.startedAt, summary.endedAt)
    const previousSession = this.getPreviousCompletedSession(summary.startedAt, summary.id)
    const previousSummary = previousSession ? this.getSessionSummary(previousSession.id) : null
    const previousUniqueDonors = previousSession ? this.listDonors(previousSession.id).length : 0

    return {
      ...summary,
      durationMinutes,
      topSupporters,
      topDonor: topSupporters[0] ?? null,
      highestSingleDonation: computeHighestSingleDonation(
        messages,
        summary.convertedCurrency ?? 'USD'
      ),
      peakDonationWindow: computePeakDonationWindow(messages),
      comparisonToPrevious: previousSummary
        ? {
            previousSessionId: previousSummary.id,
            previousTitle: previousSummary.title,
            totalRaisedDelta: summary.totalConverted - previousSummary.totalConverted,
            superChatsDelta:
              summary.messageCount -
              summary.stickerCount -
              (previousSummary.messageCount - previousSummary.stickerCount),
            uniqueDonorsDelta: uniqueDonors - previousUniqueDonors,
            averageDonationDelta: summary.averageDonation - previousSummary.averageDonation
          }
        : null,
      amountBuckets: computeAmountBuckets(messages),
      typeBreakdown: computeTypeBreakdown(messages),
      uniqueDonors,
      repeatDonors: topSupporters.filter((donor) => donor.messageCount > 1).length,
      newSupporters: this.countNewSupporters(sessionId, summary.startedAt),
      messagesPerHour: summary.messageCount / (durationMinutes / 60)
    }
  }

  private getPreviousCompletedSession(
    startedAt: string,
    currentSessionId: string
  ): StreamSession | null {
    const row = this.db
      .prepare(
        `SELECT *
        FROM sessions
        WHERE status = 'ended' AND started_at < ? AND id != ?
        ORDER BY started_at DESC
        LIMIT 1`
      )
      .get(startedAt, currentSessionId) as SessionRow | undefined

    return row ? toSession(row) : null
  }

  private countNewSupporters(sessionId: string, startedAt: string): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count
        FROM (
          SELECT DISTINCT current_messages.donor_channel_id
          FROM paid_messages current_messages
          WHERE current_messages.session_id = ?
            AND NOT EXISTS (
              SELECT 1
              FROM paid_messages earlier_messages
              INNER JOIN sessions earlier_sessions ON earlier_sessions.id = earlier_messages.session_id
              WHERE earlier_messages.donor_channel_id = current_messages.donor_channel_id
                AND earlier_sessions.started_at < ?
            )
        )`
      )
      .get(sessionId, startedAt) as { count: number }

    return row.count
  }
}
