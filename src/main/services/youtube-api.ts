import { google, type youtube_v3 } from 'googleapis'
import { getValidAccessToken } from './oauth'
import type { BroadcastInfo, ResolvedLiveTarget } from '../../shared/ipc-types'

export const INVALID_YOUTUBE_TARGET_ERROR =
  'Invalid YouTube URL or video ID. Enter a watch URL, youtu.be URL, or 11-character video ID.'
export const YOUTUBE_VIDEO_NOT_FOUND_ERROR = "We couldn't find that YouTube video."
export const YOUTUBE_VIDEO_NOT_LIVE_ERROR = 'This video is not live right now.'
export const YOUTUBE_LIVE_CHAT_UNAVAILABLE_ERROR =
  "This livestream doesn't have an active live chat available for monitoring."

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/u
const WATCH_URL_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])
const SHORT_URL_HOSTS = new Set(['youtu.be', 'www.youtu.be'])

function createClient(accessToken: string): youtube_v3.Youtube {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.youtube({ version: 'v3', auth })
}

async function getAuthenticatedClient(): Promise<youtube_v3.Youtube> {
  const token = await getValidAccessToken()
  if (!token) {
    throw new Error('Not authenticated. Please sign in first.')
  }
  return createClient(token)
}

function isValidVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value)
}

function getShortUrlVideoId(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1) return null
  return isValidVideoId(segments[0]) ? segments[0] : null
}

function getBestThumbnailUrl(video: youtube_v3.Schema$Video): string | undefined {
  return (
    video.snippet?.thumbnails?.maxres?.url ??
    video.snippet?.thumbnails?.standard?.url ??
    video.snippet?.thumbnails?.high?.url ??
    video.snippet?.thumbnails?.medium?.url ??
    video.snippet?.thumbnails?.default?.url ??
    undefined
  )
}

function isCurrentlyLive(video: youtube_v3.Schema$Video): boolean {
  if (video.snippet?.liveBroadcastContent === 'live') {
    return true
  }

  const details = video.liveStreamingDetails
  return Boolean(details?.actualStartTime && !details?.actualEndTime)
}

function toResolvedLiveTarget(videoId: string, video: youtube_v3.Schema$Video): ResolvedLiveTarget {
  if (!isCurrentlyLive(video)) {
    throw new Error(YOUTUBE_VIDEO_NOT_LIVE_ERROR)
  }

  const liveChatId = video.liveStreamingDetails?.activeLiveChatId
  if (!liveChatId) {
    throw new Error(YOUTUBE_LIVE_CHAT_UNAVAILABLE_ERROR)
  }

  return {
    videoId,
    liveChatId,
    title: video.snippet?.title ?? 'Untitled Stream',
    channelTitle: video.snippet?.channelTitle ?? 'Unknown channel',
    sourceMode: 'public_video',
    thumbnailUrl: getBestThumbnailUrl(video),
    actualStartTime: video.liveStreamingDetails?.actualStartTime ?? undefined
  }
}

// ── Channel Info ──

export async function getChannelInfo(): Promise<{
  channelId: string
  displayName: string
  avatarUrl: string
} | null> {
  const client = await getAuthenticatedClient()

  const response = await client.channels.list({
    part: ['snippet'],
    mine: true
  })

  const channel = response.data.items?.[0]
  if (!channel) return null

  return {
    channelId: channel.id!,
    displayName: channel.snippet?.title ?? 'Unknown',
    avatarUrl: channel.snippet?.thumbnails?.default?.url ?? ''
  }
}

// ── Active Broadcasts ──

export async function getActiveBroadcasts(): Promise<BroadcastInfo[]> {
  const client = await getAuthenticatedClient()

  const response = await client.liveBroadcasts.list({
    part: ['snippet', 'status', 'contentDetails'],
    broadcastStatus: 'active',
    broadcastType: 'all'
  })

  const items = response.data.items ?? []

  const broadcasts: BroadcastInfo[] = []

  for (const item of items) {
    const videoId = item.id
    if (!videoId) continue

    const videoResponse = await client.videos.list({
      part: ['liveStreamingDetails'],
      id: [videoId]
    })

    const video = videoResponse.data.items?.[0]
    const liveChatId = video?.liveStreamingDetails?.activeLiveChatId

    if (!liveChatId) continue

    broadcasts.push({
      id: videoId,
      title: item.snippet?.title ?? 'Untitled Stream',
      status: item.status?.lifeCycleStatus ?? 'unknown',
      liveChatId,
      actualStartTime: item.snippet?.actualStartTime ?? undefined,
      scheduledStartTime: item.snippet?.scheduledStartTime ?? undefined,
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? undefined
    })
  }

  return broadcasts
}

// ── Public Live Targets ──

export function normalizeYouTubeVideoId(input: string): string {
  const trimmed = input.trim()
  if (isValidVideoId(trimmed)) {
    return trimmed
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(trimmed)
  } catch {
    throw new Error(INVALID_YOUTUBE_TARGET_ERROR)
  }

  const host = parsedUrl.hostname.toLowerCase()

  if (WATCH_URL_HOSTS.has(host) && parsedUrl.pathname === '/watch') {
    const videoId = parsedUrl.searchParams.get('v')?.trim()
    if (videoId && isValidVideoId(videoId)) {
      return videoId
    }

    throw new Error(INVALID_YOUTUBE_TARGET_ERROR)
  }

  if (SHORT_URL_HOSTS.has(host)) {
    const videoId = getShortUrlVideoId(parsedUrl.pathname)
    if (videoId) {
      return videoId
    }
  }

  throw new Error(INVALID_YOUTUBE_TARGET_ERROR)
}

export async function resolveLiveTargetByVideoId(videoId: string): Promise<ResolvedLiveTarget> {
  const normalizedVideoId = normalizeYouTubeVideoId(videoId)
  const client = await getAuthenticatedClient()

  const response = await client.videos.list({
    part: ['snippet', 'liveStreamingDetails'],
    id: [normalizedVideoId]
  })

  const video = response.data.items?.[0]
  if (!video) {
    throw new Error(YOUTUBE_VIDEO_NOT_FOUND_ERROR)
  }

  return toResolvedLiveTarget(normalizedVideoId, video)
}

export async function resolveLiveTarget(input: string): Promise<ResolvedLiveTarget> {
  const videoId = normalizeYouTubeVideoId(input)
  return resolveLiveTargetByVideoId(videoId)
}

// ── Live Chat Messages ──

export interface LiveChatPollResult {
  messages: youtube_v3.Schema$LiveChatMessage[]
  nextPageToken: string | null
  pollingIntervalMillis: number
}

export async function pollLiveChatMessages(
  liveChatId: string,
  pageToken?: string
): Promise<LiveChatPollResult> {
  const client = await getAuthenticatedClient()

  const response = await client.liveChatMessages.list({
    liveChatId,
    part: ['snippet', 'authorDetails'],
    pageToken: pageToken ?? undefined
  })

  return {
    messages: response.data.items ?? [],
    nextPageToken: response.data.nextPageToken ?? null,
    pollingIntervalMillis: response.data.pollingIntervalMillis ?? 5000
  }
}
