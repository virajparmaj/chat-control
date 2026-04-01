import type {
  DonorAggregate,
  LeaderboardDonorAggregate
} from './ipc-types'

export type LeaderboardDonorSource = DonorAggregate | LeaderboardDonorAggregate

export interface RankedLeaderboardDonor extends LeaderboardDonorAggregate {
  rank: number
  isTied: boolean
}

export function normalizeLeaderboardDonor(
  donor: LeaderboardDonorSource
): LeaderboardDonorAggregate {
  return {
    channelId: donor.channelId,
    displayName: donor.displayName,
    avatarUrl: donor.avatarUrl,
    totalConverted: donor.totalConverted,
    messageCount: donor.messageCount,
    firstSeenAt: donor.firstSeenAt,
    lastSeenAt: donor.lastSeenAt
  }
}

function compareLeaderboardDonors(
  left: LeaderboardDonorAggregate,
  right: LeaderboardDonorAggregate
): number {
  if (right.totalConverted !== left.totalConverted) {
    return right.totalConverted - left.totalConverted
  }

  if (right.messageCount !== left.messageCount) {
    return right.messageCount - left.messageCount
  }

  const lastSeenDiff = new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime()
  if (lastSeenDiff !== 0) {
    return lastSeenDiff
  }

  const displayNameDiff = left.displayName.localeCompare(right.displayName, undefined, {
    sensitivity: 'base'
  })
  if (displayNameDiff !== 0) {
    return displayNameDiff
  }

  return left.channelId.localeCompare(right.channelId, undefined, {
    sensitivity: 'base'
  })
}

export function rankLeaderboardDonors(
  donors: LeaderboardDonorSource[]
): RankedLeaderboardDonor[] {
  const normalized = donors.map(normalizeLeaderboardDonor).sort(compareLeaderboardDonors)
  const ranked: RankedLeaderboardDonor[] = []

  for (const [index, donor] of normalized.entries()) {
    const previous = index > 0 ? normalized[index - 1] : null
    const next = index < normalized.length - 1 ? normalized[index + 1] : null
    const sharesRankWithPrevious = previous?.totalConverted === donor.totalConverted
    const sharesRankWithNext = next?.totalConverted === donor.totalConverted

    ranked.push({
      ...donor,
      rank: sharesRankWithPrevious ? ranked[index - 1].rank : index + 1,
      isTied: sharesRankWithPrevious || sharesRankWithNext
    })
  }

  return ranked
}

export function splitLeaderboardDonors(donors: LeaderboardDonorSource[]): {
  ranked: RankedLeaderboardDonor[]
  topThree: RankedLeaderboardDonor[]
  remainingRows: RankedLeaderboardDonor[]
} {
  const ranked = rankLeaderboardDonors(donors)

  return {
    ranked,
    topThree: ranked.slice(0, 3),
    remainingRows: ranked.slice(3)
  }
}
