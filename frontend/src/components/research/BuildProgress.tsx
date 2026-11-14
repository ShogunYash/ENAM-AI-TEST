import React from 'react'
import { Loader2, CheckCircle2, FileSearch } from 'lucide-react'

interface BuildProgressProps {
  symbol: string
  progress: string[]
  pollCount?: number
  /** once some results are already on screen, shrink to a one-line live strip above them */
  compact?: boolean
}

export const BuildProgress: React.FC<BuildProgressProps> = ({
  symbol,
  progress = [],
  pollCount = 0,
  compact = false,
}) => {
  if (compact) {
    const latest = progress[progress.length - 1] || 'Working…'
    return (
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-xs" role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-zinc-100 font-medium">
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
          <span className="leading-tight">{latest}</span>
        </div>
        <div className="mt-1 text-[11px] text-zinc-400">
          Still reading. Finished parts appear below as they are ready.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 font-mono">
              <span>Building Research</span>
              <span className="text-stock">· {symbol}</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Grounding in primary filings & transcripts
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/60 text-[10px] font-mono font-semibold text-amber-400 uppercase tracking-wider">
            Building
          </span>
        </div>
      </div>

      {/* Progress steps checklist */}
      <div className="space-y-2 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/60 font-mono text-[12px]">
        {progress.map((step, idx) => {
          const isLatest = idx === progress.length - 1
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 transition-all ${
                isLatest ? 'text-zinc-100 font-medium' : 'text-zinc-400'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isLatest ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <span className="leading-tight">{step}</span>
            </div>
          )
        })}

        {progress.length === 0 && (
          <div className="text-zinc-500 text-xs flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Discovering exchange filings...</span>
          </div>
        )}
      </div>

      {/* Primary sources disclaimer */}
      <div className="flex items-center text-[11px] text-zinc-500 pt-1">
        <span className="flex items-center gap-1">
          <FileSearch className="w-3.5 h-3.5 text-zinc-400" />
          <span>BSE annual reports & concall transcripts</span>
        </span>
      </div>
    </div>
  )
}

