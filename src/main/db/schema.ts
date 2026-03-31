import Database from 'better-sqlite3'

const CURRENT_USER_VERSION = 2

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  const exists = rows.some((row) => row.name === column)

  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

export function initializeDatabase(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      youtube_broadcast_id TEXT NOT NULL,
      live_chat_id TEXT,
      title TEXT,
      source_mode TEXT CHECK(source_mode IN ('creator_broadcast','public_video')),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','ended','error')),
      total_converted REAL DEFAULT 0,
      converted_currency TEXT,
      message_count INTEGER DEFAULT 0,
      sticker_count INTEGER DEFAULT 0,
      resume_page_token TEXT,
      last_polled_at TEXT,
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS paid_messages (
      id TEXT PRIMARY KEY,
      youtube_message_id TEXT UNIQUE NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      donor_channel_id TEXT NOT NULL,
      donor_display_name TEXT NOT NULL,
      donor_avatar_url TEXT,
      type TEXT NOT NULL CHECK(type IN ('super_chat','super_sticker')),
      amount_micros INTEGER NOT NULL,
      original_currency TEXT NOT NULL,
      original_amount REAL NOT NULL,
      converted_amount REAL,
      converted_currency TEXT,
      amount_display_string TEXT,
      message_text TEXT,
      sticker_id TEXT,
      sticker_alt_text TEXT,
      tier INTEGER NOT NULL,
      received_at TEXT NOT NULL,
      state TEXT DEFAULT 'unread' CHECK(state IN ('unread','read','saved')),
      state_changed_at TEXT,
      raw_payload TEXT
    );

    CREATE TABLE IF NOT EXISTS donors (
      channel_id TEXT NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      total_converted REAL DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (channel_id, session_id)
    );

    CREATE INDEX IF NOT EXISTS idx_pm_session ON paid_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_pm_state ON paid_messages(state);
    CREATE INDEX IF NOT EXISTS idx_pm_donor ON paid_messages(donor_channel_id);
    CREATE INDEX IF NOT EXISTS idx_pm_received ON paid_messages(received_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_donors_total ON donors(session_id, total_converted DESC);
  `)

  ensureColumn(db, 'sessions', 'resume_page_token', 'TEXT')
  ensureColumn(db, 'sessions', 'last_polled_at', 'TEXT')
  ensureColumn(db, 'sessions', 'last_error', 'TEXT')
  ensureColumn(
    db,
    'sessions',
    'source_mode',
    "TEXT CHECK(source_mode IN ('creator_broadcast','public_video'))"
  )

  db.pragma(`user_version = ${CURRENT_USER_VERSION}`)
}
