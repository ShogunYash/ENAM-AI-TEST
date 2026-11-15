import React from 'react'
import { PvDItem, Claim, Verdict, SourceDoc } from '@/api/types'
import { formatDocSourceLabel, formatActual } from '@/lib/formatters'
import { FileText, CheckCircle2, XCircle, Clock, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

interface PvDTimelineProps {
  items: PvDItem[]
  sourceDocs?: SourceDoc[]
  onSelectClaim: (claim: Claim, metricTitle: string) => void
}

export function getVerdictChip(verdict: Verdict) {
  switch (verdict) {
    case 'met':
      return {
        label: 'MET',
        className: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
      }
    case 'missed':
      return {
        label: 'MISSED',
        className: 'text-rose-400 bg-rose-950/50 border-rose-800/60',
        icon: <XCircle className="w-3 h-3 text-rose-400" />,
      }
    case 'slipped':
      return {
        label: 'SLIPPED',
        className: 'text-amber-400 bg-amber-950/50 border-amber-800/60',
        icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
      }
    case 'quietly_dropped':
      return {
        label: 'QUIETLY DROPPED',
        className: 'text-zinc-400 bg-zinc-800/80 border-zinc-700/60',
        icon: <Clock className="w-3 h-3 text-zinc-400" />,
      }
    case 'pending':
      return {
        label: 'PENDING',
        className: 'text-sky-400 bg-sky-950/50 border-sky-800/60',
        icon: <Clock className="w-3 h-3 text-sky-400" />,
      }
    case 'raised':
      return {
        label: 'RAISED',
        className: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60',
        icon: <TrendingUp className="w-3 h-3 text-emerald-400" />,
      }
    case 'cut':
      return {
        label: 'CUT',
        className: 'text-rose-400 bg-rose-950/50 border-rose-800/60',
        icon: <TrendingDown className="w-3 h-3 text-rose-400" />,
      }
    default:
      return {
        label: String(verdict).toUpperCase(),
        className: 'text-zinc-400 bg-zinc-800 border-zinc-700',
        icon: null,
      }
  }
}

function extractRange(text?: string | null): string | null {
  if (!text) return null
  const re = /(\d+(?:\.\d+)?)\s*%\s*(?:to|[-–—‒‑\u2010-\u2015\u2212])\s*(\d+(?:\.\d+)?)\s*%/i
  const m = text.match(re)
  if (m) return `${m[1]}–${m[2]}%`
  const re2 = /(\d+(?:\.\d+)?)\s*(?:to|[-–—‒‑\u2010-\u2015\u2212])\s*(\d+(?:\.\d+)?)\s*%/i
  const m2 = text.match(re2)
  if (m2) return `${m2[1]}–${m2[2]}%`
  return null
}

function getRangeShift(item: PvDItem): string | null {
  if (item.verdict !== 'cut' && item.verdict !== 'raised') return null
  const pRange =
    extractRange(item.promised.text) ||
    extractRange(item.promised.sources[0]?.quote)
  const oRange =
    extractRange(item.outcome?.text) ||
    extractRange(item.outcome?.sources[0]?.quote) ||
    extractRange(item.reason)

  if (pRange && oRange && pRange !== oRange) {
    return `${pRange} → ${oRange}`
  }
  return null
}

export const PvDTimeline: React.FC<PvDTimelineProps> = ({
  items,
  sourceDocs = [],
  onSelectClaim,
}) => {
  if (!items || items.length === 0) return null

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const chip = getVerdictChip(item.verdict)
        const rangeShift = getRangeShift(item)
        const primaryPromisedSource = item.promised.sources[0]
        const primaryOutcomeSource = item.outcome?.sources[0]
        const actualBadge = formatActual(item.actual, item.horizon)

        return (
          <div
            key={idx}
            data-verdict={item.verdict}
            className="desk-claim p-3 space-y-3"
          >
            {/* Top row: Metric name, period, and Verdict chip */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 leading-snug">
                  {item.metric}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-0.5">
                  <span>Said in {item.said_in}</span>
                  {item.horizon && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span>Horizon: {item.horizon}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Verdict Chip & Optional Range Shift */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {rangeShift && (
                  <span
                    className="font-mono text-[11px] text-zinc-300 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/60 font-semibold"
                    title={`Guidance revised: ${rangeShift}`}
                  >
                    {rangeShift}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${chip.className}`}
                >
                  {chip.icon}
                  <span>{chip.label}</span>
                </span>
              </div>
            </div>

            {/* One-line reason (<=120 chars) and table actual if available */}
            <div className="border-y border-zinc-700 py-3 text-sm text-zinc-300 leading-relaxed space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-zinc-500 font-semibold mr-1.5 uppercase text-[11px] tracking-wider">
                    Reason:
                  </span>
                  <span>{item.reason}</span>
                </div>
              </div>
              {actualBadge && (
                <div className="font-mono text-[11px] text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded inline-flex items-center gap-1">
                  <span>{actualBadge}</span>
                </div>
              )}
            </div>

            {/* Claims: Promised vs Delivered (paraphrased headlines without quotes, tap for quote) */}
            <div className="space-y-2 pt-0.5 text-xs">
              {/* Promised Claim */}
              <div
                role="button" tabIndex={0}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectClaim(item.promised, item.metric) } }}
                onClick={() => onSelectClaim(item.promised, item.metric)}
                className="desk-inset group min-h-[44px] cursor-pointer space-y-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                title="Tap to view verified verbatim quote"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-sky-400 font-semibold uppercase tracking-wider text-[11px]">
                    Guidance Promised
                  </span>
                  {primaryPromisedSource && (
                    <span className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-200 underline decoration-zinc-700 flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5 text-sky-400" />
                      <span>
                        {formatDocSourceLabel(
                          primaryPromisedSource.doc_id,
                          primaryPromisedSource.page,
                          sourceDocs
                        )}
                      </span>
                    </span>
                  )}
                </div>
                {/* Paraphrase headline shown without quotes */}
                <div className="selectable text-zinc-200 text-[12px] leading-snug font-semibold">
                  {item.promised.text}
                </div>
              </div>

              {/* Outcome Claim (if any) */}
              {item.outcome ? (
                <div
                  role="button" tabIndex={0}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectClaim(item.outcome!, item.metric) } }}
                  onClick={() => onSelectClaim(item.outcome!, item.metric)}
                  className="desk-inset group min-h-[44px] cursor-pointer space-y-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  title="Tap to view verified verbatim quote"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                      Delivered Outcome
                    </span>
                    {primaryOutcomeSource && (
                      <span className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-200 underline decoration-zinc-700 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5 text-zinc-400" />
                        <span>
                          {formatDocSourceLabel(
                            primaryOutcomeSource.doc_id,
                            primaryOutcomeSource.page,
                            sourceDocs
                          )}
                        </span>
                      </span>
                    )}
                  </div>
                  {/* Paraphrase headline shown without quotes */}
                  <div className="selectable text-zinc-200 text-[12px] leading-snug font-semibold">
                    {item.outcome.text}
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-lg border border-dashed border-zinc-800/80 bg-zinc-950/20 text-[11px] text-zinc-500 italic">
                  No outcome or update disclosed in subsequent conference calls.
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
