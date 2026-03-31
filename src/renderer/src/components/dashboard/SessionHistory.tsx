import { useCallback, useEffect, useState } from 'react'
import { Clock, History, Loader2, MessageCircle } from 'lucide-react'
import { formatCurrency } from '../../lib/currency'
import type { StreamSession } from '../../../../shared/ipc-types'
import { StreamSourceBadge } from './StreamSourceBadge'

export function SessionHistory(): React.JSX.Element {
  const [sessions, setSessions] = useState<StreamSession[]>([])
  const [loading, setLoading] = useState(true)

  const loadSessions = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.sessions.list()
      setSessions(data)
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Session History</h1>
      <p className="mb-6 text-sm text-muted-foreground">Past monitoring sessions.</p>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No sessions yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Your monitoring history will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {session.title ?? 'Untitled Stream'}
                    </p>
                    <StreamSourceBadge sourceMode={session.sourceMode} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.startedAt).toLocaleDateString()}{' '}
                      {new Date(session.startedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {session.endedAt && (
                      <span>
                        Duration:{' '}
                        {formatDuration(new Date(session.startedAt), new Date(session.endedAt))}
                      </span>
                    )}
                  </div>
                  {session.lastError && session.status === 'error' && (
                    <p className="mt-2 text-xs text-destructive">{session.lastError}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    session.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : session.status === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {session.status}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">
                  <MessageCircle className="mr-1 inline h-3 w-3" />
                  {session.messageCount} messages
                </span>
                <span className="text-muted-foreground">{session.stickerCount} stickers</span>
                <span className="ml-auto font-medium text-primary">
                  {formatCurrency(session.totalConverted, session.convertedCurrency ?? 'USD')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDuration(start: Date, end: Date): string {
  const diff = end.getTime() - start.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}
