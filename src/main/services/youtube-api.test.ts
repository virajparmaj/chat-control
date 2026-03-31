import { beforeEach, describe, expect, it, vi } from 'vitest'

const { videosList, setCredentials, getValidAccessToken } = vi.hoisted(() => ({
  videosList: vi.fn(),
  setCredentials: vi.fn(),
  getValidAccessToken: vi.fn()
}))

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials = setCredentials
      }
    },
    youtube: vi.fn(() => ({
      videos: {
        list: videosList
      }
    }))
  }
}))

vi.mock('./oauth', () => ({
  getValidAccessToken
}))

async function loadYouTubeApi(): Promise<typeof import('./youtube-api')> {
  return import('./youtube-api')
}

describe('youtube-api target normalization', () => {
  it.each([
    ['abc123def45', 'abc123def45'],
    ['  abc123def45  ', 'abc123def45'],
    ['https://www.youtube.com/watch?v=abc123def45', 'abc123def45'],
    ['https://www.youtube.com/watch?v=abc123def45&t=42s&si=test', 'abc123def45'],
    ['https://youtu.be/abc123def45', 'abc123def45'],
    ['https://youtu.be/abc123def45?si=test', 'abc123def45']
  ])('normalizes %s', async (input, expected) => {
    const { normalizeYouTubeVideoId } = await loadYouTubeApi()
    expect(normalizeYouTubeVideoId(input)).toBe(expected)
  })

  it.each([
    '',
    'invalid id!',
    'https://www.youtube.com/shorts/abc123def45',
    'https://www.youtube.com/watch?t=42s',
    'https://youtu.be/abc123def45/extra'
  ])('rejects invalid input %s', async (input) => {
    const { INVALID_YOUTUBE_TARGET_ERROR, normalizeYouTubeVideoId } = await loadYouTubeApi()
    expect(() => normalizeYouTubeVideoId(input)).toThrow(INVALID_YOUTUBE_TARGET_ERROR)
  })
})

describe('youtube-api live target resolver', () => {
  beforeEach(() => {
    vi.resetModules()
    videosList.mockReset()
    setCredentials.mockReset()
    getValidAccessToken.mockReset()
    getValidAccessToken.mockResolvedValue('access-token')
  })

  it('resolves a currently-live public video with an active live chat id', async () => {
    videosList.mockResolvedValue({
      data: {
        items: [
          {
            snippet: {
              title: 'Public Live Stream',
              channelTitle: 'Public Channel',
              liveBroadcastContent: 'live',
              thumbnails: {
                high: {
                  url: 'https://example.com/high.png'
                }
              }
            },
            liveStreamingDetails: {
              activeLiveChatId: 'public-chat-1',
              actualStartTime: '2026-03-30T12:00:00.000Z'
            }
          }
        ]
      }
    })

    const { resolveLiveTarget } = await loadYouTubeApi()
    const result = await resolveLiveTarget('https://youtu.be/abc123def45?si=test')

    expect(result).toEqual({
      videoId: 'abc123def45',
      liveChatId: 'public-chat-1',
      title: 'Public Live Stream',
      channelTitle: 'Public Channel',
      sourceMode: 'public_video',
      thumbnailUrl: 'https://example.com/high.png',
      actualStartTime: '2026-03-30T12:00:00.000Z'
    })
    expect(videosList).toHaveBeenCalledWith({
      part: ['snippet', 'liveStreamingDetails'],
      id: ['abc123def45']
    })
    expect(setCredentials).toHaveBeenCalledWith({ access_token: 'access-token' })
  })

  it('fails when the video cannot be found', async () => {
    videosList.mockResolvedValue({ data: { items: [] } })

    const { YOUTUBE_VIDEO_NOT_FOUND_ERROR, resolveLiveTargetByVideoId } = await loadYouTubeApi()

    await expect(resolveLiveTargetByVideoId('abc123def45')).rejects.toThrow(
      YOUTUBE_VIDEO_NOT_FOUND_ERROR
    )
  })

  it('fails when the video is not currently live', async () => {
    videosList.mockResolvedValue({
      data: {
        items: [
          {
            snippet: {
              title: 'Archived Stream',
              channelTitle: 'Channel',
              liveBroadcastContent: 'none'
            },
            liveStreamingDetails: {}
          }
        ]
      }
    })

    const { YOUTUBE_VIDEO_NOT_LIVE_ERROR, resolveLiveTargetByVideoId } = await loadYouTubeApi()

    await expect(resolveLiveTargetByVideoId('abc123def45')).rejects.toThrow(
      YOUTUBE_VIDEO_NOT_LIVE_ERROR
    )
  })

  it('fails when a live video has no active live chat id', async () => {
    videosList.mockResolvedValue({
      data: {
        items: [
          {
            snippet: {
              title: 'Live But No Chat',
              channelTitle: 'Channel',
              liveBroadcastContent: 'live'
            },
            liveStreamingDetails: {
              actualStartTime: '2026-03-30T12:00:00.000Z'
            }
          }
        ]
      }
    })

    const { YOUTUBE_LIVE_CHAT_UNAVAILABLE_ERROR, resolveLiveTargetByVideoId } =
      await loadYouTubeApi()

    await expect(resolveLiveTargetByVideoId('abc123def45')).rejects.toThrow(
      YOUTUBE_LIVE_CHAT_UNAVAILABLE_ERROR
    )
  })
})
