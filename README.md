# ChatControl

> Never miss a Super Chat — inbox overlay for YouTube livestream creators.

ChatControl is a desktop app that connects to your YouTube account, detects your active livestream, and filters **only Super Chats and Super Stickers** into a clean, always-on-top overlay. Mark them as read, save for later, and see real-time donation totals and donor rankings.

## Features

- **Live Super Chat inbox** — real-time feed of paid messages only
- **Read / Save for Later** — triage workflow with 5-second undo
- **Always-on-top overlay** — compact, draggable, lockable
- **Currency conversion** — auto-convert to your preferred currency
- **Donor leaderboard** — ranked by total donations per stream
- **Stream summary** — totals, top donor, averages at end of stream
- **Session history** — persistent local storage of past streams
- **Dark, minimal UI** — premium creator-first design

## Tech Stack

- Electron + React 18 + TypeScript + Vite (via electron-vite)
- Tailwind CSS + shadcn/ui patterns
- Zustand for state management
- better-sqlite3 for local persistence
- YouTube Data API v3 (official, documented endpoints only)
- Framer Motion for animations

## Setup

### 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **YouTube Data API v3**
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
   - Application type: **Desktop application**
5. Copy the **Client ID** and **Client Secret**

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and paste your credentials:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

ChatControl resolves OAuth credentials from the runtime environment first and falls back to a local `.env` during development-style runs. Packaged builds should still receive `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the release environment.

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Build

```bash
npm run build:mac    # macOS DMG
npm run build:win    # Windows installer
npm run build:linux  # Linux AppImage
```

## Usage

1. Launch the app
2. Sign in with your YouTube account
3. Start a livestream on YouTube
4. Click **Refresh** to detect your stream
5. Click **Monitor** to begin tracking
6. The overlay window opens — Super Chats appear in real time
7. Hover a card → click **Read** or **Save for Later**
8. Use sort controls: Latest / Oldest / Highest

## Architecture

```
YouTube API → Main Process (Poller) → SQLite → IPC → React Renderer
```

- **Main process**: OAuth, YouTube API, chat polling, DB, currency conversion
- **Preload**: typed contextBridge API (no raw ipcRenderer exposed)
- **Renderer**: React + Zustand, two views via hash routing (#overlay / #dashboard)
- **Two windows**: compact overlay + full dashboard

## API Usage & Quotas

- Uses `liveChatMessages.list()` polling (1 unit per call)
- Respects YouTube's `pollingIntervalMillis` response field
- Default quota: 10,000 units/day (~10+ hours of monitoring)
- Read-only scope: `youtube.readonly`
