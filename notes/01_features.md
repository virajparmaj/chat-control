# Feature Inventory

## Live Monitoring
### Implemented
- Detect active broadcasts from the authenticated YouTube account
- Start monitoring a selected live broadcast
- Poll live chat and ingest only `superChatEvent` and `superStickerEvent`
- Persist cursor state (`resume_page_token`) and polling metadata on the active session
- Recover the latest active session at launch when the live broadcast still exists

### Fixed In This Pass
- Overlay and dashboard now hydrate from the same active-session snapshot
- Restarting mid-stream no longer depends on renderer-local memory
- Starting a new session no longer leaves multiple DB sessions marked `active`

## Inbox Workflow
### Implemented
- Unread inbox in the overlay
- Mark as read
- Save for later
- One-step undo for the most recent state change
- Sorting by latest, oldest, and highest value
- Compact mode for tighter overlay cards

### Fixed In This Pass
- Read/save/undo now update SQLite first and broadcast the canonical message state back to all windows
- Saved Items now reflects the same canonical session snapshot rather than a stale window-local fetch loop
- Default sort is applied during bootstrap and session restore

## Aggregation And Summary
### Implemented
- Running totals per session
- Donor aggregation per stream session
- Leaderboard ranked by converted totals
- End-of-stream summary with top donors and averages
- Session history persisted locally

### Fixed In This Pass
- Totals and leaderboard labels now prefer the session's locked converted currency, not only the current global preference
- Main process now emits session-stat and donor updates instead of forcing full-message refetches

## Settings
### Implemented
- Preferred currency
- Default sort
- Sound enabled flag using a single system beep in main process
- Compact mode
- Overlay always-on-top
- Overlay lock

### Fixed In This Pass
- Settings are validated before persistence
- Overlay window side effects are applied immediately when settings change and again on window creation
- Settings changes now broadcast to both windows

## Security And Reliability
### Implemented
- Context-bridged preload API
- Secure token storage via Electron `safeStorage`
- OAuth PKCE + local callback server
- Typed IPC contracts
- Session error tracking in SQLite

### Fixed In This Pass
- OAuth `state` is validated on callback
- Plaintext token fallback was removed
- Main-process session finalization now handles stream end, quota failure, auth expiry, and reconnect exhaustion consistently

## Deferred Features
- Threshold-based alerts
- Pin-next mode
- Tray mode
- Keyboard shortcuts
- Export flows for summaries or saved items
