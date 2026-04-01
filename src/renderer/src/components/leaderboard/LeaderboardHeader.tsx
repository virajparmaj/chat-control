import { Download, Loader2 } from 'lucide-react'
import type { LeaderboardScope } from '../../../../shared/ipc-types'
import { cn } from '../../lib/utils'

const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f7fb] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d12] focus-visible:shadow-[0_0_0_4px_rgba(225,29,46,0.26)]'

export function LeaderboardHeader({
  scope,
  onScopeChange,
  onExport,
  exporting,
  exportDisabled,
  feedback
}: {
  scope: LeaderboardScope
  onScopeChange: (scope: LeaderboardScope) => void
  onExport: () => void
  exporting: boolean
  exportDisabled: boolean
  feedback: { tone: 'default' | 'info' | 'success' | 'error'; message: string }
}): React.JSX.Element {
  const feedbackClass =
    feedback.tone === 'success'
      ? 'text-[#62ddb3]'
      : feedback.tone === 'info'
        ? 'text-[#8f9bac]'
      : feedback.tone === 'error'
        ? 'text-[#ff9ca6]'
        : 'text-transparent'

  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1 className="font-display text-[2.2rem] font-semibold tracking-[-0.06em] text-[#f4f7fb]">
          Donor Leaderboard
        </h1>
        <p className="mt-2 text-[13px] text-[#7f8c9d]">
          Your top supporters ranked by total contributions.
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 xl:items-end">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[14px] border border-[#1f2835] bg-[#131922] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-center gap-1.5">
              <ScopeButton
                active={scope === 'stream'}
                onClick={() => onScopeChange('stream')}
                label="This Stream"
              />
              <ScopeButton
                active={scope === 'all_time'}
                onClick={() => onScopeChange('all_time')}
                label="All Time"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#283243] bg-[#161d27] px-5 text-[13px] font-medium text-[#dce4ee] transition-all duration-150 hover:border-[#334259] hover:bg-[#1b2430] disabled:cursor-not-allowed disabled:border-[#212937] disabled:text-[#6e7b8c]',
              focusRingClass
            )}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{exporting ? 'Exporting' : 'Export'}</span>
          </button>
        </div>

        <p aria-live="polite" className={cn('min-h-[1rem] text-[12px]', feedbackClass)}>
          {feedback.message}
        </p>
      </div>
    </header>
  )
}

function ScopeButton({
  active,
  onClick,
  label
}: {
  active: boolean
  onClick: () => void
  label: string
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-[10px] px-5 text-[13px] font-medium transition-all duration-150',
        focusRingClass,
        active
          ? 'border border-[#712028] bg-[#3a1419] text-[#ff5c68] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_28px_rgba(225,29,46,0.14)]'
          : 'border border-[#253041] bg-[#171f29] text-[#8f9bac] hover:border-[#334259] hover:bg-[#1b2430] hover:text-[#dce4ee]'
      )}
    >
      {label}
    </button>
  )
}
