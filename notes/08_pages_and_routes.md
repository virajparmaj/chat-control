# Pages And Routes

## Routing Model
ChatControl uses hash-based view selection inside a single renderer bundle.

Routes:
- `#/dashboard`
- `#/overlay`

If no overlay hash is present, the renderer defaults to the dashboard shell.

## Dashboard Shell
Primary navigation areas:
- Stream
- Saved
- Leaderboard
- History
- Settings

### Stream View
Component: `StreamInfo`

States:
- signed out
- no active livestreams
- active session with live stats
- summary shown after a session ends

### Saved View
Component: `SavedItems`

Purpose:
- review items marked `saved` during the current active or restored session

### Leaderboard View
Component: `DonorLeaderboard`

Purpose:
- rank donors by converted total for the current active or restored session

### History View
Component: `SessionHistory`

Purpose:
- show past sessions with counts, totals, status, and last error where applicable

### Settings View
Component: `SettingsPanel`

Purpose:
- manage sort, currency, sound, compact mode, overlay always-on-top, and overlay lock

## Overlay Shell
Component: `OverlayShell`

Sections:
- frameless title bar with collapse and lock controls
- summary strip
- unread feed
- undo snackbar
- sort controls footer

Overlay empty states:
- no active stream
- active stream but no paid messages yet
