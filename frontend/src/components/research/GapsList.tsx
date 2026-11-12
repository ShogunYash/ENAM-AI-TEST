import React from 'react'
import { AlertCircle } from 'lucide-react'

interface GapsListProps {
  gaps: string[]
}

export const GapsList: React.FC<GapsListProps> = ({ gaps = [] }) => {
  if (!gaps || gaps.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-3.5 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Document Gaps ({gaps.length})</span>
      </div>
      <p className="text-[11px] text-zinc-400 leading-snug">
        Primary sources not found or pending release. FINN never interpolates missing records.
      </p>
      <ul className="text-[11px] text-zinc-300 list-disc pl-4 space-y-1 font-mono">
        {gaps.map((gap, idx) => (
          <li key={idx} className="leading-snug">
            {gap}
          </li>
        ))}
      </ul>
    </div>
  )
}

