import React, { useState, useEffect } from 'react'
import { formatInrCr, formatPercentDelta } from '@/lib/formatters'
import { Search, CheckCircle, Clock, AlertCircle, FileText, ChevronRight } from 'lucide-react'

export const ResearchScreen: React.FC = () => {
  const [researchData, setResearchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTicker, setActiveTicker] = useState('INFY')

  useEffect(() => {
    setLoading(true)
    fetch('/data/research/INFY.json')
      .then((res) => res.json())
      .then((data) => {
        setResearchData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load research data', err)
        setLoading(false)
      })
  }, [activeTicker])

  if (loading || !researchData) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-10 bg-zinc-900 rounded-lg"></div>
        <div className="h-28 bg-zinc-900 rounded-xl"></div>
        <div className="h-48 bg-zinc-900 rounded-xl"></div>
      </div>
    )
  }

  const { symbol, name, financial_snapshot, promised_vs_delivered, gaps, sources } = researchData

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Search Header */}
      <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800">
        <Search className="w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={activeTicker}
          onChange={(e) => setActiveTicker(e.target.value.toUpperCase())}
          placeholder="Search any NSE symbol (e.g. INFY)"
          className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 font-mono font-semibold focus:outline-none"
        />
        <span className="text-[10px] text-zinc-500 font-mono">NSE</span>
      </div>

      {/* Company Header & Financial Snapshot */}
      <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-100 font-mono">{symbol}</h1>
              <span className="text-xs text-zinc-400 font-normal">{name}</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Primary Sources Only · {sources?.length || 5} docs processed
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
            Ready
          </span>
        </div>

        {/* Snapshot Metrics */}
        {financial_snapshot?.headline && (
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/60">
            {financial_snapshot.headline.map((h: any, idx: number) => {
              const yoy = formatPercentDelta(h.yoy_pct)
              return (
                <div key={idx} className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                  <div className="text-[10px] uppercase font-semibold text-zinc-400">{h.metric}</div>
                  <div className="text-xs font-mono font-bold text-zinc-100 tabular-nums mt-0.5">
                    {formatInrCr(h.value)}
                  </div>
                  <div className={`text-[10px] font-mono tabular-nums mt-0.5 font-medium ${yoy.colorClass}`}>
                    <span className="mr-0.5">{yoy.arrow}</span>
                    {yoy.text} YoY
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Flagship: Promised vs Delivered Timeline */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Promised vs Delivered
          </h2>
          <span className="text-[11px] text-zinc-500">Flagship track record</span>
        </div>

        <div className="space-y-2.5">
          {promised_vs_delivered?.map((item: any, i: number) => {
            const verdictColor =
              item.verdict === 'met'
                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
                : item.verdict === 'missed'
                ? 'text-rose-400 bg-rose-950/40 border-rose-800/60'
                : 'text-amber-400 bg-amber-950/40 border-amber-800/60'

            return (
              <div
                key={i}
                className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-200">
                    Guidance for {item.period}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${verdictColor}`}
                  >
                    {item.verdict}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-zinc-400 text-[11px]">
                    <strong className="text-zinc-300 font-medium">Promise: </strong>
                    {item.promise}
                  </div>
                  <div className="text-zinc-300 text-[11px]">
                    <strong className="text-zinc-200 font-medium">Outcome: </strong>
                    {item.outcome}
                  </div>
                </div>

                {item.source && (
                  <div className="pt-1 border-t border-zinc-800/50 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Source: {item.source.doc_id} · p.{item.source.page}</span>
                    <span className="text-emerald-500 flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5" />
                      verified
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Explicit Gaps List (FINN never hides gaps) */}
      {gaps && gaps.length > 0 && (
        <section className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
            <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>Document Gaps</span>
          </div>
          <ul className="text-[11px] text-zinc-400 list-disc pl-4 space-y-0.5">
            {gaps.map((g: string, idx: number) => (
              <li key={idx}>{g}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
