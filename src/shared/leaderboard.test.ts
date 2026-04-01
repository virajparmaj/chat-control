import { describe, expect, it } from 'vitest'
import { rankLeaderboardDonors, splitLeaderboardDonors } from './leaderboard'
import type { LeaderboardDonorAggregate } from './ipc-types'

function createDonor(
  channelId: string,
  totalConverted: number,
  overrides: Partial<LeaderboardDonorAggregate> = {}
): LeaderboardDonorAggregate {
  return {
    channelId,
    displayName: channelId,
    avatarUrl: null,
    totalConverted,
    messageCount: 1,
    firstSeenAt: '2026-03-01T10:00:00.000Z',
    lastSeenAt: '2026-03-30T10:00:00.000Z',
    ...overrides
  }
}

describe('leaderboard helpers', () => {
  it('sorts donors by total contribution descending', () => {
    const ranked = rankLeaderboardDonors([
      createDonor('third', 35),
      createDonor('first', 150),
      createDonor('second', 80)
    ])

    expect(ranked.map((donor) => donor.channelId)).toEqual(['first', 'second', 'third'])
    expect(ranked.map((donor) => donor.rank)).toEqual([1, 2, 3])
  })

  it('uses competition ranks for ties and resolves display order deterministically', () => {
    const ranked = rankLeaderboardDonors([
      createDonor('zebra', 100, {
        displayName: 'Zebra',
        messageCount: 2,
        lastSeenAt: '2026-03-28T10:00:00.000Z'
      }),
      createDonor('alpha', 100, {
        displayName: 'Alpha',
        messageCount: 4,
        lastSeenAt: '2026-03-29T10:00:00.000Z'
      }),
      createDonor('omega', 20)
    ])

    expect(ranked.map((donor) => donor.channelId)).toEqual(['alpha', 'zebra', 'omega'])
    expect(ranked.map((donor) => donor.rank)).toEqual([1, 1, 3])
    expect(ranked.map((donor) => donor.isTied)).toEqual([true, true, false])
  })

  it('splits the ranked list into podium and remaining table rows', () => {
    const donors = [
      createDonor('one', 150),
      createDonor('two', 120),
      createDonor('three', 90),
      createDonor('four', 60),
      createDonor('five', 30)
    ]

    const result = splitLeaderboardDonors(donors)

    expect(result.topThree.map((donor) => donor.channelId)).toEqual(['one', 'two', 'three'])
    expect(result.remainingRows.map((donor) => donor.channelId)).toEqual(['four', 'five'])
  })
})
