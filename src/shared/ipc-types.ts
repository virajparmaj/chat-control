// Shared types for IPC communication between main and renderer.

// Auth
export interface AuthCredentials {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface AuthStatus {
  authenticated: boolean
  oauthConfigured: boolean
  configurationError?: string
  channelId?: string
  displayName?: string
  email?: string
  avatarUrl?: string
}

// YouTube / Streams
export interface BroadcastInfo {
  id: string
  title: string
  status: string
  liveChatId: string
  actualStartTime?: string
  scheduledStartTime?: string
  thumbnailUrl?: string
}

export type StreamSourceMode = 'creator_broadcast' | 'public_video'

export interface ResolvedLiveTarget {
  videoId: string
  liveChatId: string
  title: string
  channelTitle: string
  sourceMode: 'public_video'
  thumbnailUrl?: string
  actualStartTime?: string
}

export type PaidMessageType = 'super_chat' | 'super_sticker'
export type PaidMessageState = 'unread' | 'read' | 'saved'
export type SortOrder = 'latest' | 'oldest' | 'highest'

export interface PaidMessage {
  id: string
  youtubeMessageId: string
  sessionId: string
  donorChannelId: string
  donorDisplayName: string
  donorAvatarUrl: string | null
  type: PaidMessageType
  amountMicros: number
  originalCurrency: string
  originalAmount: number
  convertedAmount: number | null
  convertedCurrency: string | null
  amountDisplayString: string | null
  messageText: string | null
  stickerId: string | null
  stickerAltText: string | null
  tier: number
  receivedAt: string
  state: PaidMessageState
  stateChangedAt: string | null
}

export type SessionStatus = 'active' | 'ended' | 'error'

export interface StreamSession {
  id: string
  youtubeBroadcastId: string
  liveChatId: string | null
  title: string | null
  sourceMode?: StreamSourceMode | null
  startedAt: string
  endedAt: string | null
  status: SessionStatus
  totalConverted: number
  convertedCurrency: string | null
  messageCount: number
  stickerCount: number
  resumePageToken: string | null
  lastPolledAt: string | null
  lastError: string | null
}

export interface SessionStats {
  totalConverted: number
  messageCount: number
  stickerCount: number
  unreadCount: number
  savedCount: number
  averageDonation: number
  convertedCurrency: string | null
}

export interface SessionSummary extends StreamSession {
  highestDonor: DonorAggregate | null
  topDonors: DonorAggregate[]
  savedCount: number
  averageDonation: number
}

export interface ActiveSessionSnapshot {
  session: StreamSession
  messages: PaidMessage[]
  donors: DonorAggregate[]
  stats: SessionStats
}

export interface DonorAggregate {
  channelId: string
  sessionId: string
  displayName: string
  avatarUrl: string | null
  totalConverted: number
  messageCount: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface AppPreferences {
  preferredCurrency: string
  defaultSort: SortOrder
  soundEnabled: boolean
  overlayAlwaysOnTop: boolean
  overlayLocked: boolean
  compactMode: boolean
  theme: 'dark'
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  preferredCurrency: 'USD',
  defaultSort: 'latest',
  soundEnabled: false,
  overlayAlwaysOnTop: true,
  overlayLocked: false,
  compactMode: false,
  theme: 'dark'
}

export type StreamStatusEvent =
  | { type: 'connected'; sessionId: string }
  | { type: 'polling'; sessionId: string }
  | { type: 'reconnecting'; attempt: number; sessionId: string }
  | { type: 'ended'; sessionId: string }
  | { type: 'error'; sessionId: string; message: string }

export interface IpcInvokeChannels {
  'auth:login': { args: []; result: AuthStatus }
  'auth:logout': { args: []; result: void }
  'auth:status': { args: []; result: AuthStatus }
  'youtube:get-broadcasts': { args: []; result: BroadcastInfo[] }
  'youtube:resolve-target': { args: [input: string]; result: ResolvedLiveTarget }
  'youtube:start-session': { args: [broadcastId: string]; result: StreamSession }
  'youtube:start-session-from-target': {
    args: [target: ResolvedLiveTarget]
    result: StreamSession
  }
  'youtube:stop-session': { args: []; result: SessionSummary | null }
  'superchat:list': {
    args: [sessionId: string, state?: PaidMessageState, sort?: SortOrder]
    result: PaidMessage[]
  }
  'superchat:mark-read': { args: [messageId: string]; result: PaidMessage | null }
  'superchat:save': { args: [messageId: string]; result: PaidMessage | null }
  'superchat:undo': { args: [messageId: string]; result: PaidMessage | null }
  'donors:list': { args: [sessionId: string]; result: DonorAggregate[] }
  'sessions:list': { args: []; result: StreamSession[] }
  'sessions:summary': { args: [sessionId: string]; result: SessionSummary | null }
  'sessions:get-active': { args: []; result: ActiveSessionSnapshot | null }
  'settings:get': { args: []; result: AppPreferences }
  'settings:update': { args: [prefs: Partial<AppPreferences>]; result: AppPreferences }
  'window:overlay-toggle': { args: []; result: void }
  'window:overlay-lock': { args: [locked: boolean]; result: void }
}

export interface IpcSendChannels {
  'session:active': ActiveSessionSnapshot | null
  'superchat:new': PaidMessage
  'superchat:updated': PaidMessage
  'session:stats': SessionStats
  'donors:updated': DonorAggregate[]
  'stream:status': StreamStatusEvent
  'session:summary': SessionSummary
  'settings:changed': AppPreferences
}
