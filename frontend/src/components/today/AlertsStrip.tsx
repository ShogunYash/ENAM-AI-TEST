import React from 'react'
import { Alert } from '@/api/types'
import { formatPercentDelta, formatVolumeMultiple } from '@/lib/formatters'
import { Bell, Flame, TrendingUp, TrendingDown, FileText } from 'lucide-react'

interface AlertsStripProps {
  alerts: Alert[]
  onSelectFiling?: (filingId: string) => void
}

export const AlertsStrip: React.FC<AlertsStripProps> = ({ alerts, onSelectFiling }) => {
  if (!alerts || alerts.length === 0) return null

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-1 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>Active Alerts</span>
          <span className="text-[11px] font-mono px-1.5 py-0.2 bg-zinc-800 text-zinc-400 rounded-full">
            {alerts.length}
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5">
        {alerts.map((al) => {
          const isClickable = !!al.filing_id && !!onSelectFiling
          let badgeIcon = <Bell className="w-3 h-3 text-amber-400" />
          let borderClass = 'border-zinc-800 bg-zinc-900/90'

          if (al.kind === 'volume_spike') {
            badgeIcon = <Flame className="w-3 h-3 text-orange-400" />
            borderClass = 'border-orange-950/60 bg-orange-950/20'
          } else if (al.kind === 'price_move') {
            const delta = formatPercentDelta(al.value)
            badgeIcon = al.value > 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-400" />
            )
            borderClass = al.value > 0 ? 'border-emerald-950/60 bg-emerald-950/20' : 'border-rose-950/60 bg-rose-950/20'
          } else if (al.kind === 'material_filing') {
            badgeIcon = <FileText className="w-3 h-3 text-blue-400" />
            borderClass = 'border-blue-950/60 bg-blue-950/20'
          }

          return (
            <div
              key={al.id}
              onClick={() => {
                if (al.filing_id && onSelectFiling) {
                  onSelectFiling(al.filing_id)
                }
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${borderClass} ${
                isClickable ? 'cursor-pointer hover:border-zinc-700' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                {badgeIcon}
                <span className="font-mono font-bold text-stock">{al.symbol}</span>
              </div>
              <span className="text-zinc-300 font-medium">
                {al.message}
              </span>
              {isClickable && (
                <span className="text-[10px] text-zinc-400 underline decoration-zinc-600">
                  view
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
