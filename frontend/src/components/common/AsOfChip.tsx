import React from 'react'
import { formatExactIst } from '@/lib/formatters'
import { RefreshCw } from 'lucide-react'

interface AsOfChipProps {
  asOf: string
  isLive?: boolean
  source?: 'live' | 'snapshot'
  label?: string
  isRefreshing?: boolean
  onRefresh?: () => void
}

export const AsOfChip: React.FC<AsOfChipProps> = ({
  asOf,
  isLive = false,
  source = 'snapshot',
  label,
  isRefreshing = false,
  onRefresh,
}) => {
  const displayLabel = label || (isLive ? 'LIVE' : source === 'snapshot' ? 'SNAPSHOT' : 'DEMO DATA')
  const isGreen = displayLabel.toUpperCase().includes('LIVE')
  const isBlue = displayLabel.toUpperCase().includes('SNAPSHOT')

  const dotColor = isGreen
    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
    : isBlue
    ? 'bg-sky-400'
    : 'bg-amber-400'

  const textColor = isGreen
    ? 'text-emerald-400'
    : isBlue
    ? 'text-sky-400'
    : 'text-amber-400'

  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-900/90 border border-zinc-800/80 rounded-full px-2.5 py-0.5 backdrop-blur-sm whitespace-nowrap flex-shrink-0">
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`}
        title={
          isGreen
            ? 'Connected to live backend (mode: live)'
            : isBlue
            ? 'Offline snapshot data'
            : 'Demo fixture data (mode: mock)'
        }
      />
      <span className="font-mono text-zinc-300">
        {formatExactIst(asOf)}
      </span>
      <span className="text-zinc-600 font-mono">·</span>
      <span className={`tracking-wider font-semibold font-mono ${textColor}`}>
        {displayLabel}
      </span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="ml-0.5 -my-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:text-zinc-200 transition-colors disabled:opacity-40"
          title="Refresh from API"
          aria-label="Refresh data"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-zinc-300' : ''}`} />
        </button>
      )}
    </div>
  )
}
