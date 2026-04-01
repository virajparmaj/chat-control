import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, TriangleAlert } from 'lucide-react'
import { useSettingsStore } from '../../store/settings'
import { useStreamStore } from '../../store/stream'
import { useSuperchatStore } from '../../store/superchats'
import { splitLeaderboardDonors } from '../../../../shared/leaderboard'
import type { LeaderboardDonorAggregate, LeaderboardScope } from '../../../../shared/ipc-types'
import { LeaderboardHeader } from './LeaderboardHeader'
import { LeaderboardPodium } from './LeaderboardPodium'
import { LeaderboardTable } from './LeaderboardTable'

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

interface ExportFeedback {
  tone: 'default' | 'info' | 'success' | 'error'
  message: string
}

export function DonorLeaderboard(): React.JSX.Element {
  const donors = useSuperchatStore((state) => state.donors)
  const stats = useSuperchatStore((state) => state.stats)
  const loading = useSuperchatStore((state) => state.loading)
  const activeSession = useStreamStore((state) => state.activeSession)
  const preferences = useSettingsStore((state) => state.preferences)

  const [scope, setScope] = useState<LeaderboardScope>('stream')
  const [allTimeStatus, setAllTimeStatus] = useState<AsyncStatus>('idle')
  const [allTimeRows, setAllTimeRows] = useState<LeaderboardDonorAggregate[] | null>(null)
  const [allTimeDirty, setAllTimeDirty] = useState(false)
  const [screenError, setScreenError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportFeedback, setExportFeedback] = useState<ExportFeedback>({
    tone: 'default',
    message: 'Export the currently visible leaderboard as a production-ready CSV.'
  })

  const donorRefreshKey = useMemo(
    () =>
      `${activeSession?.id ?? 'none'}:${donors
        .map((donor) => `${donor.channelId}:${donor.totalConverted}:${donor.messageCount}:${donor.lastSeenAt}`)
        .join('|')}`,
    [activeSession?.id, donors]
  )
  const previousRefreshKeyRef = useRef<string | null>(null)

  const displayCurrency =
    activeSession?.convertedCurrency ?? stats.convertedCurrency ?? preferences.preferredCurrency

  const loadAllTimeLeaderboard = useCallback(async (): Promise<void> => {
    setAllTimeStatus('loading')
    setScreenError(null)

    try {
      const rows = await window.api.donors.listAllTime()
      setAllTimeRows(rows)
      setAllTimeDirty(false)
      setAllTimeStatus('success')
    } catch (error: unknown) {
      setAllTimeStatus('error')
      setScreenError(
        error instanceof Error
          ? error.message
          : 'Unable to load all-time donor rankings right now.'
      )
    }
  }, [])

  useEffect(() => {
    if (previousRefreshKeyRef.current === null) {
      previousRefreshKeyRef.current = donorRefreshKey
      return
    }

    if (previousRefreshKeyRef.current !== donorRefreshKey && allTimeRows !== null) {
      setAllTimeDirty(true)
    }

    previousRefreshKeyRef.current = donorRefreshKey
  }, [allTimeRows, donorRefreshKey])

  useEffect(() => {
    if (scope === 'all_time' && (allTimeRows === null || allTimeDirty)) {
      void loadAllTimeLeaderboard()
    }
  }, [allTimeDirty, allTimeRows, loadAllTimeLeaderboard, scope])

  const visibleDonors = scope === 'stream' ? donors : (allTimeRows ?? [])
  const { topThree, remainingRows, ranked } = useMemo(
    () => splitLeaderboardDonors(visibleDonors),
    [visibleDonors]
  )

  const isLoading =
    scope === 'stream' ? loading : allTimeStatus === 'loading' || allTimeStatus === 'idle'
  const isEmpty = !isLoading && ranked.length === 0
  const hasRetryableError = scope === 'all_time' && allTimeStatus === 'error' && ranked.length === 0
  const exportDisabled = exporting || isLoading || ranked.length === 0

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    setExportFeedback({
      tone: 'info',
      message: 'Preparing your leaderboard export...'
    })

    try {
      const path = await window.api.donors.exportLeaderboard(scope)
      setExportFeedback({
        tone: path ? 'success' : 'error',
        message: path ? `Exported leaderboard to ${path}` : 'No leaderboard data is available to export yet.'
      })
    } catch (error: unknown) {
      setExportFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to export the leaderboard.'
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <LeaderboardHeader
        scope={scope}
        onScopeChange={setScope}
        onExport={() => void handleExport()}
        exporting={exporting}
        exportDisabled={exportDisabled}
        feedback={exportFeedback}
      />

      {scope === 'all_time' && screenError && ranked.length > 0 && (
        <section className="flex items-center justify-between gap-4 rounded-[18px] border border-[#67232c] bg-[#241519] px-4 py-3 text-sm text-[#f7c2c8] shadow-[0_18px_42px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3">
            <TriangleAlert className="h-4 w-4 text-[#ff8d99]" />
            <p>{screenError}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadAllTimeLeaderboard()}
            className="rounded-[10px] border border-[#7a2c36] px-3 py-1.5 text-xs font-semibold text-[#ffe2e6] transition-colors hover:bg-white/[0.04]"
          >
            Retry
          </button>
        </section>
      )}

      {hasRetryableError ? (
        <section className="rounded-[28px] border border-[#5b1f29] bg-[#141820] p-8 shadow-[0_24px_72px_rgba(0,0,0,0.32)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#6f1d25] bg-[#2a151a] text-[#ff7682]">
                <TriangleAlert className="h-6 w-6" />
              </div>
              <h2 className="font-display text-[1.85rem] font-semibold tracking-[-0.05em] text-[#f4f7fb]">
                Leaderboard unavailable
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#98a4b3]">
                {screenError ?? 'We could not load all-time donor rankings right now.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAllTimeLeaderboard()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#e11d2e] px-5 text-sm font-semibold text-[#fff5f6] transition-colors hover:bg-[#ef3342]"
            >
              Retry
            </button>
          </div>
        </section>
      ) : isLoading ? (
        <LeaderboardLoadingState />
      ) : isEmpty ? (
        <LeaderboardEmptyState scope={scope} />
      ) : (
        <>
          <LeaderboardPodium donors={topThree} currency={displayCurrency} />
          <LeaderboardTable rows={remainingRows} currency={displayCurrency} />
        </>
      )}
    </div>
  )
}

function LeaderboardLoadingState(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid items-end gap-4 xl:grid-cols-[1fr_1.08fr_1fr]">
        {['left', 'center', 'right'].map((slot, index) => (
          <div
            key={slot}
            className={`rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,22,30,0.98),rgba(14,18,24,0.98))] p-6 shadow-[0_22px_56px_rgba(0,0,0,0.28)] ${
              index === 1 ? 'min-h-[260px]' : 'min-h-[212px]'
            }`}
          >
            <div className="h-7 w-20 rounded-full bg-white/[0.06]" />
            <div className="mt-7 flex justify-center">
              <div className={`rounded-full bg-white/[0.07] ${index === 1 ? 'h-24 w-24' : 'h-16 w-16'}`} />
            </div>
            <div className="mx-auto mt-7 h-5 w-36 rounded-full bg-white/[0.06]" />
            <div className="mx-auto mt-4 h-9 w-32 rounded-full bg-white/[0.08]" />
            <div className="mx-auto mt-3 h-4 w-24 rounded-full bg-white/[0.05]" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#202834] bg-[#121821] shadow-[0_28px_72px_rgba(0,0,0,0.32)]">
        <div className="grid grid-cols-[90px_minmax(0,1.65fr)_180px_190px_150px] border-b border-white/6 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f7b8d]">
          <span>Rank</span>
          <span>Donor</span>
          <span>Donations</span>
          <span>Last Donation</span>
          <span className="text-right">Total</span>
        </div>
        <div className="space-y-3 px-5 py-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[90px_minmax(0,1.65fr)_180px_190px_150px] items-center rounded-[18px] px-2 py-3"
            >
              <div className="h-6 w-10 rounded-full bg-white/[0.06]" />
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-white/[0.06]" />
                <div className="space-y-2">
                  <div className="h-4 w-28 rounded-full bg-white/[0.08]" />
                  <div className="h-3 w-20 rounded-full bg-white/[0.05]" />
                </div>
              </div>
              <div className="h-4 w-24 rounded-full bg-white/[0.06]" />
              <div className="h-4 w-24 rounded-full bg-white/[0.06]" />
              <div className="ml-auto h-5 w-20 rounded-full bg-white/[0.08]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LeaderboardEmptyState({ scope }: { scope: LeaderboardScope }): React.JSX.Element {
  const title =
    scope === 'stream' ? 'No supporters ranked yet' : 'No local donor history available'
  const body =
    scope === 'stream'
      ? 'Start or restore live monitoring to see the highest-value supporters stack into the podium.'
      : 'As soon as ChatControl stores donor history locally, your all-time leaderboard will appear here.'

  return (
    <section className="rounded-[28px] border border-dashed border-[#2a3442] bg-[#111821] px-8 py-14 text-center shadow-[0_20px_52px_rgba(0,0,0,0.26)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/8 bg-white/[0.03] text-[#98a4b3]">
        <Trophy className="h-7 w-7" />
      </div>
      <h2 className="font-display mt-5 text-[1.9rem] font-semibold tracking-[-0.05em] text-[#f4f7fb]">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#98a4b3]">{body}</p>
    </section>
  )
}
