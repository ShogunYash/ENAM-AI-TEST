import React, { useState } from 'react'
import { RoutineGroup as RoutineGroupType } from '@/api/types'
import { formatRelativeIst, formatCategory } from '@/lib/formatters'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

interface RoutineGroupProps {
  routine: RoutineGroupType
}

export const RoutineGroup: React.FC<RoutineGroupProps> = ({ routine }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const count = routine.count || routine.items?.length || 0

  if (count === 0) return null

  // Format category breakdown: e.g. "investor_meetings (1), unclassified (1)"
  const breakdown = Object.entries(routine.by_category || {})
    .map(([cat, cnt]) => `${cat.replace(/_/g, ' ')} (${cnt})`)
    .join(' · ')

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
      {/* Collapsed Header / Trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300">
              Routine ({count})
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
              Collapsed
            </span>
          </div>
          {breakdown && (
            <p className="text-[11px] text-zinc-400 truncate max-w-[280px]">
              {breakdown}
            </p>
          )}
        </div>

        <div className="text-zinc-400">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded item list */}
      {isExpanded && (
        <div className="border-t border-zinc-800/60 divide-y divide-zinc-800/40 bg-zinc-950/30">
          {routine.items.map((item) => (
            <div key={item.id} className="p-3 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-zinc-200">{item.symbol}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400">{formatCategory(item.category)}</span>
                </div>
                <time dateTime={item.filed_at} className="text-zinc-400">
                  {formatRelativeIst(item.filed_at)}
                </time>
              </div>

              <div className="text-zinc-300 text-[13px] leading-snug">
                {item.headline}
              </div>

              {item.pdf_url && (
                <div className="pt-1">
                  <a
                    href={item.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    <span>PDF</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
