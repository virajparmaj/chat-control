import { broadcastToRenderers } from './broadcast'
import { getQueries } from './database'
import { getAppPreferences } from './preferences'
import type { AppPreferences, PaidMessage } from '../../shared/ipc-types'

export function broadcastActiveSession(): void {
  const snapshot = getQueries().getActiveSessionSnapshot(getAppPreferences().defaultSort)
  broadcastToRenderers('session:active', snapshot)
}

export function broadcastSessionStats(sessionId: string): void {
  broadcastToRenderers('session:stats', getQueries().getSessionStats(sessionId))
}

export function broadcastDonorsUpdated(sessionId: string): void {
  broadcastToRenderers('donors:updated', getQueries().listDonors(sessionId))
}

export function broadcastSuperchatUpdated(message: PaidMessage): void {
  broadcastToRenderers('superchat:updated', message)
}

export function broadcastSettingsChanged(preferences: AppPreferences): void {
  broadcastToRenderers('settings:changed', preferences)
}

export function broadcastSessionSummary(sessionId: string): void {
  const summary = getQueries().getSessionSummary(sessionId)
  if (summary) {
    broadcastToRenderers('session:summary', summary)
  }
}
