import React from 'react'
import { formatExactIst } from '@/lib/formatters'
import { RefreshCw } from 'lucide-react'

interface AsOfChipProps {
  asOf: string
  source: 'live' | 'snapshot'
  isRefreshing?: boolean
  onRefresh?: () => void
}

export const AsOfChip: React.FC<AsOfChipProps> = ({
  asOf,
  source,
  isRefreshing = false,
  onRefresh,
}) => {
  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/90 border border-zinc-800/80 rounded-full px-2.5 py-1 backdrop-blur-sm">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          source === 'live'
            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
            : 'bg-amber-400'
        }`}
        title={source === 'live' ? 'Connected to live backend' : 'Snapshot data (offline)'}
      />
      <span className="font-mono text-[11px] text-zinc-300">
        as of {formatExactIst(asOf)}
      </span>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
        {source}
      </span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="ml-0.5 p-0.5 hover:text-zinc-200 transition-colors disabled:opacity-40"
          title="Refresh from API"
          aria-label="Refresh data"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-zinc-300' : ''}`} />
        </button>
      )}
    </div>
  )
}
