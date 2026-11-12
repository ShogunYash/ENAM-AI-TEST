import React from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface GapsListProps {
  gaps?: string[]
}

export const GapsList: React.FC<GapsListProps> = ({ gaps = [] }) => {
  const hasGaps = gaps && gaps.length > 0

  return (
    <div
      className={`rounded-xl border p-3.5 space-y-2 text-xs ${
        hasGaps
          ? 'border-amber-900/40 bg-amber-950/15'
          : 'border-zinc-800/80 bg-zinc-950/40'
      }`}
    >
      <div className="flex items-center gap-1.5 font-semibold text-xs">
        {hasGaps ? (
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className={hasGaps ? 'text-amber-300' : 'text-zinc-300'}>
          Document Gaps ({gaps.length})
        </span>
      </div>
      <p className="text-[11px] text-zinc-400 leading-snug">
        Primary sources missing or pending release. FINN never interpolates missing records.
      </p>
      {hasGaps ? (
        <ul className="text-[11px] text-zinc-300 list-disc pl-4 space-y-1 font-mono">
          {gaps.map((gap, idx) => (
            <li key={idx} className="leading-snug">
              {gap}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[11px] text-emerald-400/90 font-mono">
          All primary earnings calls and annual reports accounted for (0 gaps).
        </div>
      )}
    </div>
  )
}
