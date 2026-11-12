import React from 'react'
import { ResultsCard } from '@/api/types'
import { formatInrCr, formatPercentDelta } from '@/lib/formatters'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface ResultsCardPayloadProps {
  enrichment: ResultsCard
}

const METRIC_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  ebitda: 'EBITDA',
  pbt: 'PBT',
  pat: 'PAT',
}

export const ResultsCardPayload: React.FC<ResultsCardPayloadProps> = ({ enrichment }) => {
  const { period, basis, metrics, margin_ebitda_pct, cross_check } = enrichment

  return (
    <div className="mt-2.5 space-y-2">
      {/* Subheader: Period & cross-check status */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <span className="font-medium text-zinc-300">
          {period} {basis ? `· ${basis}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {margin_ebitda_pct !== null && margin_ebitda_pct !== undefined && (
            <span className="font-mono text-zinc-400">
              EBITDA mgn <strong className="text-zinc-200">{margin_ebitda_pct.toFixed(1)}%</strong>
            </span>
          )}
          {cross_check && cross_check.status === 'mismatch' ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-1.5 py-0.5 rounded"
              title={cross_check.note || 'Screener.in reported numbers differ by >2%'}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              Screener mismatch
            </span>
          ) : cross_check && cross_check.status === 'match' ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono"
              title={
                enrichment.source?.page
                  ? `Verified against BSE doc (page ${enrichment.source.page}) and Screener.in`
                  : 'Verified against Screener.in'
              }
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              Verified{enrichment.source?.page ? ` (p. ${enrichment.source.page})` : ''}
            </span>
          ) : null}
        </div>
      </div>

      {/* 4x3 Results Table */}
      <div className="rounded-md border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/90 text-[11px] text-zinc-400">
              <th className="py-1.5 px-2.5 font-medium">Metric</th>
              <th className="py-1.5 px-2 font-medium text-right">Value</th>
              <th className="py-1.5 px-2 font-medium text-right">QoQ</th>
              <th className="py-1.5 px-2.5 font-medium text-right">YoY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {metrics.map((m) => {
              const label = METRIC_LABELS[m.name.toLowerCase()] || m.name.toUpperCase()
              const qoq = formatPercentDelta(m.qoq_pct)
              const yoy = formatPercentDelta(m.yoy_pct)

              return (
                <tr key={m.name} className="hover:bg-zinc-800/20">
                  <td className="py-1.5 px-2.5 font-medium text-zinc-300">
                    {label}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-zinc-100 text-right tabular-nums">
                    {formatInrCr(m.value)}
                  </td>
                  <td
                    className={`py-1.5 px-2 font-mono text-right tabular-nums font-medium ${qoq.colorClass}`}
                  >
                    <span className="mr-0.5 text-[10px]">{qoq.arrow}</span>
                    {qoq.text}
                  </td>
                  <td
                    className={`py-1.5 px-2.5 font-mono text-right tabular-nums font-medium ${yoy.colorClass}`}
                  >
                    <span className="mr-0.5 text-[10px]">{yoy.arrow}</span>
                    {yoy.text}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
