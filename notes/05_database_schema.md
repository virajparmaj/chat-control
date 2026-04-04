# Database Schema

## Storage Location
SQLite database file:
- `chatcontrol.db` under `app.getPath('userData')`

Preferences and encrypted tokens are stored separately in the same user-data root.

## Migration Strategy
- Schema initialization lives in `src/main/db/schema.ts`
- `PRAGMA user_version` is set to `2` (`CURRENT_USER_VERSION = 2` in `src/main/db/schema.ts`)
- New `sessions` columns are added in-place with `ALTER TABLE` guards
- WAL mode is enabled
- Foreign keys are enabled

## Tables

### `preferences`
Purpose:
- store durable local app preferences as JSON blobs or keyed values

Columns:
- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL`

Current key in use:
- `app_preferences`

### `sessions`
Purpose:
- one monitoring run per YouTube broadcast session

Columns:
- `id TEXT PRIMARY KEY`
- `youtube_broadcast_id TEXT NOT NULL`
- `live_chat_id TEXT`
- `title TEXT`
- `started_at TEXT NOT NULL`
- `ended_at TEXT`
- `source_mode TEXT CHECK(source_mode IN ('creator_broadcast','public_video'))`
- `status TEXT DEFAULT 'active' CHECK(status IN ('active','ended','error'))`
- `total_converted REAL DEFAULT 0`
- `converted_currency TEXT`
- `message_count INTEGER DEFAULT 0`
- `sticker_count INTEGER DEFAULT 0`
- `resume_page_token TEXT`
- `last_polled_at TEXT`
- `last_error TEXT`

Notes:
- `resume_page_token` is used for restart recovery
- `last_polled_at` records the last successful or failed polling timestamp
- `last_error` stores the most recent fatal or recovery error for history/debugging

### `paid_messages`
Purpose:
- durable inbox rows for paid chat events only

Columns:
- `id TEXT PRIMARY KEY`
- `youtube_message_id TEXT UNIQUE NOT NULL`
- `session_id TEXT NOT NULL REFERENCES sessions(id)`
- `donor_channel_id TEXT NOT NULL`
- `donor_display_name TEXT NOT NULL`
- `donor_avatar_url TEXT`
- `type TEXT NOT NULL CHECK(type IN ('super_chat','super_sticker'))`
- `amount_micros INTEGER NOT NULL`
- `original_currency TEXT NOT NULL`
- `original_amount REAL NOT NULL`
- `converted_amount REAL`
- `converted_currency TEXT`
- `amount_display_string TEXT`
- `message_text TEXT`
- `sticker_id TEXT`
- `sticker_alt_text TEXT`
- `tier INTEGER NOT NULL`
- `received_at TEXT NOT NULL`
- `state TEXT DEFAULT 'unread' CHECK(state IN ('unread','read','saved'))`
- `state_changed_at TEXT`
- `raw_payload TEXT`

Notes:
- `youtube_message_id` enforces deduplication
- `state` drives inbox, saved items, and summary counts
- `raw_payload` is retained for debugging and future data extraction

### `donors`
Purpose:
- per-session aggregate totals for leaderboard and summary use

Columns:
- `channel_id TEXT NOT NULL`
- `session_id TEXT NOT NULL REFERENCES sessions(id)`
- `display_name TEXT NOT NULL`
- `avatar_url TEXT`
- `total_converted REAL DEFAULT 0`
- `message_count INTEGER DEFAULT 0`
- `first_seen_at TEXT NOT NULL`
- `last_seen_at TEXT NOT NULL`
- `PRIMARY KEY (channel_id, session_id)`

## Indexes
- `idx_pm_session`
- `idx_pm_state`
- `idx_pm_donor`
- `idx_pm_received`
- `idx_sessions_status`
- `idx_donors_total`

## Derived Data Model
ChatControl intentionally stores both raw rows and derived aggregates:
- raw paid-message rows for inbox/history fidelity
- donor aggregates for leaderboard performance
- session totals for fast summary and recovery bootstrap
