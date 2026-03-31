# Known Issues

## Current Test Coverage Snapshot
- Automated Vitest coverage now exists for:
  - preference normalization and merging
  - inbox sorting, stat math, fallback-to-original currency math, and snapshot hydration
  - renderer empty states for signed-out, no-stream, overlay-no-session, and overlay-no-paid-messages
  - saved-items filtering, leaderboard rendering, stream summary rendering, and runtime bootstrap hydration
  - poller filtering, sticker-only ingest, reconnect/recovery, reconnect exhaustion, quota failure, auth expiry, and natural end handling
  - session-manager start/replace and startup recovery flows
- Manual QA is still required for full desktop/Electron behavior, real OAuth, live YouTube discovery, real paid-message ingestion, restart recovery in the packaged app, and cross-window smoke validation.

## Remaining Technical Issues
- There is still no automated Electron smoke suite for launch, overlay hydration, and stop-to-summary flow.
- Database query tests exist but are currently skipped in plain Node-based Vitest runs because `better-sqlite3` in this workspace is compiled for Electron's ABI rather than the local Node ABI.
- The overlay and dashboard render full in-memory lists; there is no virtualization for very long stream sessions.
- `raw_payload` is retained in SQLite with no pruning or retention policy yet.
- FX rates are cached in memory only; there is no persisted offline cache across restarts.
- If Electron secure storage is unavailable on a device, login is intentionally blocked rather than downgraded to plaintext token storage.

## Manual QA Coverage Still Important
- first launch and signed-out bootstrap
- full auth flow with browser consent
- stream detection against a real live broadcast
- live incoming Super Chat handling
- live sticker-only handling
- read/save transitions across dashboard and overlay
- totals, leaderboard, and stream-end summary validation against real session data
- reconnect/resume and restart-mid-stream behavior in the packaged app
- expired auth state and currency conversion failure behavior under live or fully integrated conditions
- absence checks for deferred threshold alerts and pin-next mode

## Product Scope Limits That Are Still Deferred
- No threshold-based alerts
- No pin-next moderation mode
- No tray-first experience
- No keyboard shortcut triage
- No export/share flow for summaries, donors, or saved items
