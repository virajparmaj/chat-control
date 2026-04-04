# API Contracts

## Boundary Principle
All privileged operations live in the Electron main process. Renderers must use the preload bridge and must not assume direct access to Node or Electron internals.

## Invoke Channels

### Auth
- `auth:login -> AuthStatus`
- `auth:logout -> void`
- `auth:status -> AuthStatus`

`AuthStatus` now always includes:
- `authenticated: boolean`
- `oauthConfigured: boolean`
- optional `configurationError: string`

`auth:status` is the renderer bootstrap source for both sign-in state and OAuth setup readiness.

### YouTube / Sessions
- `youtube:get-broadcasts -> BroadcastInfo[]`
- `youtube:resolve-target(input: string) -> ResolvedLiveTarget` — resolve any YouTube URL or video ID to a live target
- `youtube:start-session(broadcastId) -> StreamSession`
- `youtube:start-session-from-target(target: ResolvedLiveTarget) -> StreamSession` — start from a public stream
- `youtube:stop-session() -> SessionSummary | null`
- `sessions:get-active() -> ActiveSessionSnapshot | null`
- `sessions:list() -> StreamSession[]`
- `sessions:summary(sessionId) -> SessionSummary | null`
- `sessions:report(sessionId) -> SessionReport | null` — full analytics report (peak windows, type breakdown, comparisons)
- `sessions:export-csv(sessionId) -> string | null` — writes CSV to Downloads, returns path
- `sessions:copy-summary(sessionId) -> string | null` — copies summary text to clipboard, returns it

### Inbox / Donors
- `superchat:list(sessionId, state?, sort?) -> PaidMessage[]`
- `superchat:list-saved(sort?) -> SavedArchiveItem[]` — saved items across all sessions
- `superchat:mark-read(messageId) -> PaidMessage | null`
- `superchat:save(messageId) -> PaidMessage | null`
- `superchat:undo(messageId) -> PaidMessage | null`
- `superchat:mark-all-read(sessionId) -> PaidMessage[]` — bulk clear unread for active session
- `superchat:clear-saved() -> PaidMessage[]` — wipe entire saved archive
- `superchat:export-saved(sort?) -> string | null` — writes CSV to Downloads, returns path
- `superchat:copy-text(messageId) -> string | null` — copies message text to clipboard
- `donors:list(sessionId) -> DonorAggregate[]`
- `donors:list-all-time() -> LeaderboardDonorAggregate[]` — all-time cross-session aggregate
- `donors:export-leaderboard(scope: 'stream' | 'all_time') -> string | null` — CSV to Downloads

### Preferences / Windowing / App
- `settings:get() -> AppPreferences`
- `settings:update(partialPrefs) -> AppPreferences`
- `settings:clear-local-data() -> AppPreferences` — wipes all sessions/messages/donors, resets preferences
- `app:get-meta() -> AppMeta` — returns `{ name, version }`
- `window:overlay-toggle() -> void`
- `window:overlay-lock(locked) -> void`

## Send Channels

### Session Bootstrap And Lifecycle
- `session:active -> ActiveSessionSnapshot | null`
- `stream:status -> StreamStatusEvent`
- `session:summary -> SessionSummary`

### Incremental Data Updates
- `superchat:new -> PaidMessage`
- `superchat:updated -> PaidMessage`
- `session:stats -> SessionStats`
- `donors:updated -> DonorAggregate[]`
- `settings:changed -> AppPreferences`

## Renderer Bootstrap Contract
On shell mount:
1. Fetch preferences.
2. Invoke `sessions:get-active`.
3. Hydrate stores from the returned snapshot.
4. Subscribe to send-channel events for incremental updates.

This avoids relying on one renderer window to prime the other.

## Validation Rules
- Settings updates are sanitized before persistence.
- Invalid message ids are rejected in main and return `null` for state-change handlers.
- OAuth state is validated before token exchange.
- Renderer never receives raw secrets or token material.
