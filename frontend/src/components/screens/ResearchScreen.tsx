import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchResearchData } from '@/api/client'
import { Claim, SourceDoc } from '@/api/types'
import { formatInrCr, formatPercentDelta, formatExactIst } from '@/lib/formatters'
import { PvDTimeline } from '@/components/research/PvDTimeline'
import { BuildProgress } from '@/components/research/BuildProgress'
import { CitationDrawer } from '@/components/research/CitationDrawer'
import { GapsList } from '@/components/research/GapsList'
import {
  Search,
  CheckCircle2,
  FileText,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react'

export const ResearchScreen: React.FC = () => {
  const [tickerInput, setTickerInput] = useState('INFY')
  const [activeSymbol, setActiveSymbol] = useState('INFY')
  const [selectedClaim, setSelectedClaim] = useState<{
    claim: Claim
    metricTitle: string
  } | null>(null)
  const [pollCount, setPollCount] = useState(0)

  // Query research data with 3s polling when building
  const {
    data: researchResult,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['research', activeSymbol],
    queryFn: async () => {
      const res = await fetchResearchData(activeSymbol)
      return res
    },
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status === 'building' ? 3000 : false
    },
  })

  // Track polls when building
  useEffect(() => {
    if (researchResult?.data?.status === 'building') {
      setPollCount((prev) => prev + 1)
    } else {
      setPollCount(0)
    }
  }, [researchResult?.data?.status, isFetching])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = tickerInput.trim().toUpperCase()
    if (clean && clean !== activeSymbol) {
      setActiveSymbol(clean)
    }
  }

  const handleQuickTicker = (sym: string) => {
    setTickerInput(sym)
    setActiveSymbol(sym)
  }

  const research = researchResult?.data
  const sourceDocs = research?.sources || []
  const isBuilding = research?.status === 'building'
  const isReady = research?.status === 'ready' || research?.status === 'partial'

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Ticker Search Box: "Research any ticker" */}
      <section className="space-y-2">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            placeholder="Research any ticker (e.g. INFY, DIXON, TITAN)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-16 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 font-mono font-semibold focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
          <button
            type="submit"
            className="absolute right-2 px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
          >
            GO
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mr-0.5">
            Suggested:
          </span>
          {[
            { sym: 'INFY', note: 'Ready' },
            { sym: 'DIXON', note: 'Building demo' },
            { sym: 'CERA', note: 'Results' },
            { sym: 'TITAN', note: 'Mgmt' },
          ].map((item) => (
            <button
              key={item.sym}
              type="button"
              onClick={() => handleQuickTicker(item.sym)}
              className={`px-2 py-0.5 rounded-md border text-[11px] font-mono transition-all ${
                activeSymbol === item.sym
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-bold'
                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{item.sym}</span>
              <span className="text-[9px] text-zinc-500 ml-1">({item.note})</span>
            </button>
          ))}
        </div>
      </section>

      {/* Loading Skeleton */}
      {isLoading && !research && (
        <div className="p-4 space-y-3 animate-pulse">
          <div className="h-6 bg-zinc-900 rounded w-1/3"></div>
          <div className="h-28 bg-zinc-900 rounded-xl"></div>
          <div className="h-44 bg-zinc-900 rounded-xl"></div>
        </div>
      )}

      {/* Building State View */}
      {isBuilding && research && (
        <BuildProgress
          symbol={research.symbol}
          progress={research.progress}
          pollCount={pollCount}
        />
      )}

      {/* Ready / Partial State View */}
      {isReady && research && (
        <div className="space-y-4">
          {/* Company & Financial Snapshot Header */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-zinc-100 font-mono tracking-tight">
                    {research.symbol}
                  </h1>
                  {research.name && (
                    <span className="text-xs text-zinc-400 font-medium">
                      {research.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-0.5">
                  <span>Primary sources only</span>
                  <span>·</span>
                  <span>{sourceDocs.length} transcripts & filings</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
                  {research.status}
                </span>
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="p-1 hover:text-zinc-200 text-zinc-500 transition-colors"
                  title="Refresh research"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-zinc-300' : ''}`} />
                </button>
              </div>
            </div>

            {/* Headline TTM Metrics */}
            {research.snapshot?.headline && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60">
                {research.snapshot.headline.map((h, i) => {
                  const yoy = formatPercentDelta(h.yoy_pct)
                  const isCr = h.unit === 'INR_CR'
                  return (
                    <div
                      key={i}
                      className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/60"
                    >
                      <div className="text-[10px] uppercase font-semibold text-zinc-400 truncate">
                        {h.name}
                      </div>
                      <div className="text-xs font-mono font-bold text-zinc-100 tabular-nums mt-0.5">
                        {h.value !== null ? (isCr ? formatInrCr(h.value, 0) : `${h.value.toFixed(1)}%`) : '—'}
                      </div>
                      <div className="mt-0.5">
                        {h.yoy_pct !== null ? (
                          <span className={`text-[10px] font-mono tabular-nums font-medium ${yoy.colorClass}`}>
                            <span className="mr-0.5">{yoy.arrow}</span>
                            {yoy.text}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-500">—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Key Ratios Strip */}
            {research.snapshot?.ratios && (
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-400 flex-wrap gap-2">
                <div>
                  <span className="text-zinc-500">ROCE: </span>
                  <span className="text-zinc-200 font-semibold">
                    {research.snapshot.ratios.roce?.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">ROE: </span>
                  <span className="text-zinc-200 font-semibold">
                    {research.snapshot.ratios.roe?.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Cash Conv: </span>
                  <span className="text-zinc-200 font-semibold">
                    {research.snapshot.ratios.cash_conversion?.toFixed(2)}×
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">WC Days: </span>
                  <span className="text-zinc-200 font-semibold">
                    {research.snapshot.ratios.working_capital_days?.toFixed(0)}d
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Flagship: Promised vs Delivered Timeline */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Promised vs Delivered
                </h2>
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded-full">
                  {research.pvd.length}
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">Tap claim for verified quote</span>
            </div>

            <PvDTimeline
              items={research.pvd}
              onSelectClaim={(claim, metricTitle) =>
                setSelectedClaim({ claim, metricTitle })
              }
            />
          </section>

          {/* Bull vs Bear Extra Grounded Claims */}
          {research.extra?.bull_bear && (
            <section className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Grounding Highlights
                </h2>
                <span className="text-[11px] text-zinc-500 font-mono">Primary quotes</span>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                {/* Bull Claims */}
                {research.extra.bull_bear.bull?.map((claim, idx) => (
                  <div
                    key={`bull-${idx}`}
                    onClick={() => setSelectedClaim({ claim, metricTitle: 'Bull Thesis' })}
                    className="p-2.5 rounded-xl border border-emerald-950/80 bg-emerald-950/20 hover:border-emerald-700/80 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Supporting Fact</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono underline decoration-zinc-700">
                        {claim.sources[0]?.doc_id} · p.{claim.sources[0]?.page}
                      </span>
                    </div>
                    <div className="text-zinc-200 text-[12px] leading-snug">
                      "{claim.text}"
                    </div>
                  </div>
                ))}

                {/* Bear Claims */}
                {research.extra.bull_bear.bear?.map((claim, idx) => (
                  <div
                    key={`bear-${idx}`}
                    onClick={() => setSelectedClaim({ claim, metricTitle: 'Risk Factor' })}
                    className="p-2.5 rounded-xl border border-rose-950/80 bg-rose-950/20 hover:border-rose-700/80 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        <span>Risk Observation</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono underline decoration-zinc-700">
                        {claim.sources[0]?.doc_id} · p.{claim.sources[0]?.page}
                      </span>
                    </div>
                    <div className="text-zinc-200 text-[12px] leading-snug">
                      "{claim.text}"
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Explicit Gaps List (Always visible per FINN rules) */}
          <section className="pt-1">
            <GapsList gaps={research.gaps} />
          </section>

          {/* Sources Footnote */}
          <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
            <span>Primary Sources Grounded: {sourceDocs.length}</span>
            <span>LLM Calls: {research.cost?.llm_calls || 7} (cached)</span>
          </div>
        </div>
      )}

      {/* Citation Drawer / Bottom Sheet */}
      <CitationDrawer
        claim={selectedClaim?.claim || null}
        metricTitle={selectedClaim?.metricTitle}
        sourceDocs={sourceDocs}
        onClose={() => setSelectedClaim(null)}
      />
    </div>
  )
}
