import React from 'react'
import { PvDItem, Claim, Verdict } from '@/api/types'
import { FileText, ArrowRight, CheckCircle2, XCircle, Clock, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

interface PvDTimelineProps {
  items: PvDItem[]
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

export const PvDTimeline: React.FC<PvDTimelineProps> = ({ items, onSelectClaim }) => {
  if (!items || items.length === 0) return null

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const chip = getVerdictChip(item.verdict)
        const primaryPromisedSource = item.promised.sources[0]
        const primaryOutcomeSource = item.outcome?.sources[0]

        return (
          <div
            key={idx}
            className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-2.5 transition-all hover:border-zinc-700/80"
          >
            {/* Top row: Metric name, period, and Verdict chip */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 leading-snug">
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

              {/* Verdict Chip */}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${chip.className}`}
              >
                {chip.icon}
                <span>{chip.label}</span>
              </span>
            </div>

            {/* One-line reason */}
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs text-zinc-300 font-medium leading-relaxed">
              <span className="text-zinc-500 font-semibold mr-1.5 uppercase text-[10px] tracking-wider">
                Reason:
              </span>
              {item.reason}
            </div>

            {/* Claims: Promised vs Delivered */}
            <div className="space-y-2 pt-0.5 text-xs">
              {/* Promised Claim */}
              <div
                onClick={() => onSelectClaim(item.promised, item.metric)}
                className="group p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-800/30 hover:border-zinc-700 cursor-pointer transition-all space-y-1.5"
                title="Tap to open verified source citation"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-sky-400 font-semibold uppercase tracking-wider text-[10px]">
                    Guidance Promised
                  </span>
                  {primaryPromisedSource && (
                    <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 underline decoration-zinc-700 flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5 text-sky-400" />
                      <span>{primaryPromisedSource.doc_id} · p.{primaryPromisedSource.page}</span>
                    </span>
                  )}
                </div>
                <div className="text-zinc-200 text-[12px] leading-snug">
                  "{item.promised.text}"
                </div>
              </div>

              {/* Outcome Claim (if any) */}
              {item.outcome ? (
                <div
                  onClick={() => onSelectClaim(item.outcome!, item.metric)}
                  className="group p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-800/30 hover:border-zinc-700 cursor-pointer transition-all space-y-1.5"
                  title="Tap to open verified source citation"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px]">
                      Delivered Outcome
                    </span>
                    {primaryOutcomeSource && (
                      <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 underline decoration-zinc-700 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{primaryOutcomeSource.doc_id} · p.{primaryOutcomeSource.page}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-200 text-[12px] leading-snug">
                    "{item.outcome.text}"
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

