# Dev Setup

## Prerequisites
- Node.js 20 or newer recommended
- npm
- A Google Cloud project with YouTube Data API v3 enabled
- OAuth desktop-app credentials

## Environment Variables
Required for local auth:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Typical setup:
```bash
cp .env.example .env
```

Then populate:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

Runtime resolution order:
- existing process environment variables win
- if they are absent, ChatControl falls back to a local project `.env`
- after changing credentials, relaunch the app so the main process picks up the new values

## Install
```bash
npm install
```

## Run In Development
```bash
npm run dev
```

## Verification Commands
```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Test Notes
- `npm test` runs the Vitest suite for shared logic, renderer/store logic, poller behavior, and session-manager recovery behavior.
- Renderer/component tests use `jsdom` plus React Testing Library.
- One database-query test file is currently expected to skip in plain Node-based Vitest runs because `better-sqlite3` in this workspace is built for Electron's ABI. To run that suite for real, the test runner needs an Electron-compatible runtime or a matching native rebuild.
- There is not yet an Electron smoke-test harness for full app launch, overlay window validation, or packaged-app restart recovery.

## Build Commands
```bash
npm run build:unpack
npm run build:mac
npm run build:win
npm run build:linux
```

## Local Data Locations
ChatControl stores runtime data under Electron `app.getPath('userData')`.

Important files:
- `chatcontrol.db`
- `auth-tokens.enc`

Typical platform locations:
- macOS: `~/Library/Application Support/ChatControl/`
- Windows: `%APPDATA%/ChatControl/`
- Linux: `~/.config/ChatControl/`

## VS Code Recommendation
Current workspace recommendation:
- `dbaeumer.vscode-eslint`

## Debugging Notes
- OAuth uses a loopback callback on `127.0.0.1` with a random port.
- The overlay route is `#/overlay` and the dashboard route is `#/dashboard`.
- SQLite schema initialization runs automatically on first access.
