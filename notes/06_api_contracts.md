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
- `youtube:start-session(broadcastId) -> StreamSession`
- `youtube:stop-session() -> SessionSummary | null`
- `sessions:get-active() -> ActiveSessionSnapshot | null`
- `sessions:list() -> StreamSession[]`
- `sessions:summary(sessionId) -> SessionSummary | null`

### Inbox / Donors
- `superchat:list(sessionId, state?, sort?) -> PaidMessage[]`
- `superchat:mark-read(messageId) -> PaidMessage | null`
- `superchat:save(messageId) -> PaidMessage | null`
- `superchat:undo(messageId) -> PaidMessage | null`
- `donors:list(sessionId) -> DonorAggregate[]`

### Preferences / Windowing
- `settings:get() -> AppPreferences`
- `settings:update(partialPrefs) -> AppPreferences`
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
