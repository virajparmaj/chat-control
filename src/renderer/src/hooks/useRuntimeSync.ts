import { useEffect } from 'react'
import { useSettingsStore } from '../store/settings'
import { useStreamStore } from '../store/stream'
import { useSuperchatStore } from '../store/superchats'

export function useRuntimeSync(): void {
  const fetchPreferences = useSettingsStore((state) => state.fetchPreferences)
  const setPreferences = useSettingsStore((state) => state.setPreferences)
  const hydrateActiveSession = useStreamStore((state) => state.hydrateActiveSession)
  const setStreamStatus = useStreamStore((state) => state.setStreamStatus)
  const setSessionSummary = useStreamStore((state) => state.setSessionSummary)
  const hydrateSnapshot = useSuperchatStore((state) => state.hydrateSnapshot)
  const addMessage = useSuperchatStore((state) => state.addMessage)
  const upsertMessage = useSuperchatStore((state) => state.upsertMessage)
  const setDonors = useSuperchatStore((state) => state.setDonors)
  const setStats = useSuperchatStore((state) => state.setStats)
  const setSort = useSuperchatStore((state) => state.setSort)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async (): Promise<void> => {
      const preferences = await fetchPreferences()
      if (cancelled) return

      const snapshot = await window.api.sessions.getActive()
      if (cancelled) return

      hydrateActiveSession(snapshot)
      hydrateSnapshot(snapshot, preferences.defaultSort)
    }

    void bootstrap()

    const unsubSessionActive = window.api.on.sessionActive((snapshot) => {
      hydrateActiveSession(snapshot)
      hydrateSnapshot(snapshot, useSettingsStore.getState().preferences.defaultSort)
    })
    const unsubNew = window.api.on.newSuperchat((message) => {
      addMessage(message)
    })
    const unsubUpdated = window.api.on.superchatUpdated((message) => {
      upsertMessage(message)
    })
    const unsubDonors = window.api.on.donorsUpdated((donors) => {
      setDonors(donors)
    })
    const unsubStats = window.api.on.sessionStats((stats) => {
      setStats(stats)
    })
    const unsubStatus = window.api.on.streamStatus((status) => {
      setStreamStatus(status)
    })
    const unsubSummary = window.api.on.sessionSummary((summary) => {
      setSessionSummary(summary)
    })
    const unsubSettings = window.api.on.settingsChanged((preferences) => {
      setPreferences(preferences)
      setSort(preferences.defaultSort)
    })

    return () => {
      cancelled = true
      unsubSessionActive()
      unsubNew()
      unsubUpdated()
      unsubDonors()
      unsubStats()
      unsubStatus()
      unsubSummary()
      unsubSettings()
    }
  }, [
    addMessage,
    fetchPreferences,
    hydrateActiveSession,
    hydrateSnapshot,
    setDonors,
    setPreferences,
    setSessionSummary,
    setSort,
    setStats,
    setStreamStatus,
    upsertMessage
  ])
}
