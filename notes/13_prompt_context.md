# Prompt Context

## Purpose
This file is for future AI contributors or engineers who need fast orientation inside the repository.

## Source Of Truth
1. `src/`
2. `notes/`
3. `README.md`

If notes drift from code, update the notes.

## Architecture Landmarks
- Main entry: `src/main/index.ts`
- Session lifecycle: `src/main/services/session-manager.ts`
- Poller: `src/main/services/live-chat-poller.ts`
- OAuth: `src/main/services/oauth.ts`
- Preferences: `src/main/services/preferences.ts`
- Runtime broadcasts: `src/main/services/runtime-events.ts`
- DB schema: `src/main/db/schema.ts`
- DB queries: `src/main/db/queries.ts`
- Preload bridge: `src/preload/index.ts`
- Renderer bootstrap: `src/renderer/src/hooks/useRuntimeSync.ts`

## Important Constraints
- Main process is the canonical source of session state.
- Renderer stores are view models, not the authority.
- Session restore must bootstrap from `sessions:get-active`.
- Cross-window state changes must be broadcast from main, not patched only in one renderer.
- Security defaults must remain `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- Token storage must remain encrypted only. Do not reintroduce plaintext fallback.

## Current Deferred Scope
Do not claim these are implemented unless code actually lands for them:
- threshold-based alerts
- pin-next mode
- tray mode
- keyboard shortcuts
- export flows

## Good Next Targets
- Electron smoke coverage
- feed virtualization for long streams
- data retention controls
- release signing/notarization
