import Database from 'better-sqlite3'
import type {
  ActiveSessionSnapshot,
  DonorAggregate,
  PaidMessage,
  PaidMessageState,
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

  updateMessageState(id: string, state: PaidMessageState): PaidMessage | null {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE paid_messages SET state = ?, state_changed_at = ? WHERE id = ?')
      .run(state, now, id)

    return this.getPaidMessage(id)
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
}
