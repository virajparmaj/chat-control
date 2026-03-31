# ChatControl Overview

## Product Summary
ChatControl is a desktop-first Electron app for YouTube livestream creators. It watches the creator's currently active broadcast, ingests only paid messages from live chat, and presents them in a compact always-on-top overlay plus a fuller dashboard.

## Current Product Shape
- Two-window desktop experience: dashboard plus overlay
- Local-first persistence with SQLite under the app user data directory
- OAuth desktop login against YouTube read-only scope
- Main-process canonical session state with renderer hydration over typed IPC
- Automatic active-session restore on launch when recovery is possible

## Implemented Now
- OAuth login and logout
- Active stream detection
- Live Super Chat and Super Sticker polling
- Deduplication by YouTube message id
- Read, save, undo, saved-items, running totals, donor leaderboard, session summary, session history
- Session cursor persistence and restart recovery attempts
- Overlay lock and always-on-top preferences
- Preferred currency conversion with cached FX lookups

## Fixed In This Pass
- Active session restore now hydrates both dashboard and overlay from SQLite-backed state
- Message state changes now sync across windows through canonical main-process events
- Session lifecycle now closes or errors stale active sessions instead of leaving orphaned runtime state behind
- Manual stop, natural stream end, auth expiry, and unrecoverable polling failures now share a common finalization path
- OAuth callback state validation is enforced
- Browser windows now explicitly run with `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`
- Plaintext token-storage fallback was removed; secure storage is now required

## Explicitly Deferred
- Threshold-based alerts
- Pin-next mode
- Tray menu and background tray-only mode
- Keyboard shortcuts beyond Electron defaults
- OBS-specific scene integrations and richer streaming automation

## Source Of Truth
1. Implementation under `src/`
2. Notes under `notes/`
3. Top-level product framing in `README.md`

When notes and implementation diverge, the implementation wins and the notes should be updated.
