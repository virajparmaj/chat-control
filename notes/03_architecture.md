# Architecture

## High-Level Shape
`YouTube API -> Electron main process -> SQLite -> typed IPC -> React/Zustand renderer`

## Main Process Is Canonical
The main process owns all durable business state:
- OAuth session and token refresh
- Broadcast discovery
- Live chat polling
- FX conversion at ingestion time
- SQLite persistence
- Active session lifecycle and recovery
- Cross-window broadcasts for canonical state changes

## Process Boundaries
### Main
Key folders:
- `src/main/ipc/`
- `src/main/services/`
- `src/main/db/`
- `src/main/windows/`

Responsibilities:
- Register IPC handlers
- Create dashboard and overlay windows
- Run session recovery on startup
- Finalize active sessions on stop/end/error

### Preload
File: `src/preload/index.ts`

Responsibilities:
- Expose a small typed `window.api`
- Hide raw `ipcRenderer`
- Register typed event listeners for session, message, donor, settings, and summary updates

### Renderer
Key folders:
- `src/renderer/src/components/`
- `src/renderer/src/store/`
- `src/renderer/src/hooks/`

Responsibilities:
- Render dashboard and overlay views
- Hydrate from `sessions:get-active`
- Reflect canonical events from the main process
- Keep transient UI state such as the current view and collapse state

## Session Lifecycle
1. User signs in.
2. Dashboard fetches active broadcasts.
3. User starts monitoring a broadcast.
4. Main creates the session row, opens the overlay, broadcasts the active snapshot, and starts the poller.
5. Poller writes paid messages, donor aggregates, session totals, and resume metadata.
6. Main emits `superchat:new`, `session:stats`, and `donors:updated` as data changes.
7. On manual stop, natural end, auth expiry, quota failure, or reconnect exhaustion, main finalizes the session and emits terminal status events.

## Recovery Model
On app startup:
- Main inspects the latest `active` session in SQLite.
- Older duplicate `active` sessions are marked `error`.
- If auth is still valid and the YouTube broadcast can be found, polling resumes from the stored cursor.
- If recovery fails, the stale session is marked `error` and removed from runtime state.

## External Dependencies
- **YouTube Data API v3** — broadcast discovery, live chat polling (`googleapis` SDK, requires OAuth token)
- **open.er-api.com** — exchange-rate lookups for currency conversion (`src/main/services/exchange-rate.ts`). Rates are cached in-memory for 1 hour. Falls back to stale cache on API failure. No persisted offline cache across restarts.
- **Google OAuth endpoints** — token exchange (`https://oauth2.googleapis.com/token`) and user consent (`https://accounts.google.com/o/oauth2/v2/auth`)

## Local-First Desktop Model
ChatControl is local-first in the sense that:
- the app does not require a backend
- all session history, saved state, and aggregates are stored locally
- renderer windows bootstrap from SQLite snapshots instead of assuming one renderer is the source of truth
