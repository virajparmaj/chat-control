# Roadmap

## Near-Term
- Add Electron smoke tests for login, session restore, overlay hydration, and cross-window state sync
- Enable database query tests under an Electron-compatible test runtime so the current skipped suite runs in CI
- Extend renderer coverage toward dashboard navigation and settings interactions now that the jsdom harness is in place
- Add retention controls or pruning for old raw payloads and long session history
- Improve large-session feed performance with virtualization or paging

## Product Features Deferred From This Pass
- Threshold-based alerts with configurable trigger levels
- Pin-next mode for explicit creator moderation workflow
- Tray menu and minimize-to-tray behavior
- Keyboard shortcuts for read/save/undo navigation

## Medium-Term
- Better sound/notification preferences beyond a single system beep (`shell.beep()`)
- Currency source resiliency with persisted stale-cache fallback
- Richer analytics on donor trends across sessions

## Longer-Term
- OBS-oriented integrations or scene-aware workflows
- Multi-session browsing beyond the current active-session saved/leaderboard scope
- Additional accessibility polish and theme options
