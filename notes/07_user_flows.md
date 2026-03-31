# User Flows

## 1. Sign In
1. User opens ChatControl.
2. Dashboard checks `auth:status`.
3. If unauthenticated, renderer shows the login screen.
4. User clicks sign in.
5. Main starts desktop OAuth, validates callback `state`, stores encrypted tokens, and returns channel identity.

## 2. Discover A Stream
1. Authenticated dashboard requests `youtube:get-broadcasts`.
2. Main lists active YouTube broadcasts for the creator.
3. Dashboard renders available live broadcasts or an explicit empty state if none are live.

## 3. Start Monitoring
1. User clicks `Monitor` on a live broadcast.
2. Main creates a session row in SQLite.
3. Main opens the overlay window.
4. Main broadcasts `session:active` so both windows hydrate the same snapshot.
5. Poller begins reading live chat using the broadcast's `liveChatId`.

## 4. Triage Paid Messages
1. Poller filters only `superChatEvent` and `superStickerEvent`.
2. Main writes the paid message row, donor aggregate, session totals, and resume cursor.
3. Main emits `superchat:new`, `session:stats`, and `donors:updated`.
4. Overlay shows the unread inbox.
5. User can mark a card read, save it, or undo the most recent state change.
6. Main persists the state change and broadcasts `superchat:updated` plus fresh stats.

## 5. Save For Later
1. User saves a message from overlay or dashboard.
2. Message state changes to `saved` in SQLite.
3. Saved Items view shows the canonical saved rows for the currently active or restored session snapshot.

## 6. Restart Mid-Stream
1. App closes unexpectedly or is restarted.
2. On next launch, main checks for the most recent `active` session in SQLite.
3. If auth is still valid and the YouTube broadcast is still live, polling resumes from `resume_page_token`.
4. Dashboard and overlay both hydrate from `sessions:get-active`.
5. If recovery fails, the stale session is marked `error` and removed from runtime state.

## 7. Manual Stop
1. User clicks `Stop` in the dashboard.
2. Main finalizes the session as `ended`.
3. Main broadcasts `session:active` with `null`, `stream:status` with `ended`, and `session:summary`.
4. Dashboard shows the summary card.

## 8. Natural Stream End
1. Poller detects `chatEndedEvent` or a terminal `liveChatNotFound` response.
2. Main finalizes the session through the same shared end path.
3. Summary and status events are emitted to both windows.

## 9. Expired Auth During Monitoring
1. Poller hits an auth failure or refresh can no longer succeed.
2. Session is finalized as `error` with `last_error` populated.
3. Active runtime state is cleared.
4. User must sign in again before monitoring can resume.

## 10. Network Drop
1. Poller enters reconnect mode with exponential backoff.
2. Renderer receives `stream:status` reconnect events.
3. If retries recover, polling continues from the stored cursor.
4. If retries are exhausted, the session is finalized as `error`.

## Deferred Flow Concepts
- Threshold-triggered alerts
- Pin-next moderation queue
- Tray-first workflow
- Keyboard shortcut triage
