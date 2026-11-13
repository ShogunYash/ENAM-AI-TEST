import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchResearchData,
  fetchSnapshotMeta,
  fetchCompaniesCatalog,
  CatalogCompany,
} from '@/api/client'
import { Claim, SourceDoc } from '@/api/types'
import { formatInrCr, formatPercentDelta, formatDocSourceLabel } from '@/lib/formatters'
import { PvDTimeline } from '@/components/research/PvDTimeline'
import { BuildProgress } from '@/components/research/BuildProgress'
import { CitationDrawer } from '@/components/research/CitationDrawer'
import { GapsList } from '@/components/research/GapsList'
import {
  Search,
  Layers,
  RefreshCw,
  Bot,
  ArrowLeft,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

export type ResearchScope = 'prebuilt' | 'portfolio' | 'watchlist'

interface ResearchScreenProps {
  onAskFinn?: (symbol: string, sourceDocs: SourceDoc[]) => void
}

export const ResearchScreen: React.FC<ResearchScreenProps> = ({ onAskFinn }) => {
  // Navigation: selectedCompany null = Research Home list; string = Company Detail
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [scope, setScope] = useState<ResearchScope>(() => {
    try {
      return (localStorage.getItem('finn.researchScope') as ResearchScope) || 'prebuilt'
    } catch {
      return 'prebuilt'
    }
  })
  const [selectedClaim, setSelectedClaim] = useState<{
    claim: Claim
    metricTitle: string
  } | null>(null)
  const [pollCount, setPollCount] = useState(0)

  // Fetch meta for pre-built research symbols
  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: fetchSnapshotMeta,
    staleTime: Infinity,
  })

  const prebuiltSymbols = useMemo(
    () => meta?.research_symbols || ['INFY', 'BAJFINANCE', 'POLYCAB', 'KPIL'],
    [meta?.research_symbols]
  )

  // Fetch full company catalog (with in_portfolio flag)
  const { data: catalog = [] } = useQuery<CatalogCompany[]>({
    queryKey: ['companiesCatalog'],
    queryFn: fetchCompaniesCatalog,
    staleTime: Infinity,
  })

  // Pre-load verdict summaries for the prebuilt symbols
  const { data: prebuiltSummaries = {} } = useQuery<Record<string, string>>({
    queryKey: ['prebuiltSummaries', prebuiltSymbols],
    queryFn: async () => {
      const map: Record<string, string> = {}
      await Promise.all(
        prebuiltSymbols.map(async (sym) => {
          try {
            const res = await fetchResearchData(sym)
            if (res.data?.pvd && res.data.pvd.length > 0) {
              const counts: Record<string, number> = {}
              res.data.pvd.forEach((item) => {
                const v = item.verdict || 'pending'
                counts[v] = (counts[v] || 0) + 1
              })
              const priority = ['pending', 'cut', 'raised', 'missed', 'met']
              const parts: string[] = []
              for (const k of priority) {
                if (counts[k]) parts.push(`${counts[k]} ${k}`)
              }
              for (const [k, cnt] of Object.entries(counts)) {
                if (!priority.includes(k)) parts.push(`${cnt} ${k}`)
              }
              if (parts.length > 0) {
                map[sym] = parts.join(' · ')
              }
            }
          } catch {}
        })
      )
      return map
    },
    staleTime: Infinity,
  })

  // Query research data when a company is selected (with 3s polling when building)
  const {
    data: researchResult,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['research', selectedCompany],
    queryFn: async () => {
      if (!selectedCompany) return null
      return await fetchResearchData(selectedCompany)
    },
    enabled: Boolean(selectedCompany),
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

  // Browser back-gesture support
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.finnResearchCompany) {
        setSelectedCompany(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleScopeChange = (newScope: ResearchScope) => {
    setScope(newScope)
    try {
      localStorage.setItem('finn.researchScope', newScope)
    } catch {}
  }

  const openDetail = (sym: string) => {
    setSelectedCompany(sym)
    try {
      window.history.pushState({ finnResearchCompany: sym }, '')
    } catch {}
  }

  const handleBack = () => {
    setSelectedCompany(null)
    if (window.history.state?.finnResearchCompany) {
      window.history.back()
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = searchQuery.trim().toUpperCase()
    if (clean) {
      openDetail(clean)
    }
  }

  // Filter and sort companies for current scope
  const { displayedList, fullReportCount } = useMemo(() => {
    let list: CatalogCompany[] = []
    if (scope === 'prebuilt') {
      list = catalog.filter((c) => prebuiltSymbols.includes(c.symbol))
      // If catalog not loaded yet, fallback to symbols
      if (list.length === 0 && prebuiltSymbols.length > 0) {
        list = prebuiltSymbols.map((sym) => ({
          symbol: sym,
          name: sym,
          sector: '',
          in_portfolio: true,
        }))
      }
    } else if (scope === 'portfolio') {
      list = catalog.filter((c) => c.in_portfolio)
    } else {
      list = catalog.filter((c) => !c.in_portfolio)
    }

    // Sort inside tab: pre-built first, then A-Z
    const sorted = [...list].sort((a, b) => {
      const aPre = prebuiltSymbols.includes(a.symbol)
      const bPre = prebuiltSymbols.includes(b.symbol)
      if (aPre && !bPre) return -1
      if (!aPre && bPre) return 1
      return a.symbol.localeCompare(b.symbol)
    })

    const fullCount = sorted.filter((c) => prebuiltSymbols.includes(c.symbol)).length

    // Filter live with search query
    const q = searchQuery.trim().toLowerCase()
    const filtered = q
      ? sorted.filter(
          (c) =>
            c.symbol.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            (c.sector && c.sector.toLowerCase().includes(q))
        )
      : sorted

    return { displayedList: filtered, fullReportCount: fullCount }
  }, [catalog, scope, prebuiltSymbols, searchQuery])

  // ==========================================
  // VIEW 1: RESEARCH HOME (Company Picker)
  // ==========================================
  if (!selectedCompany) {
    return (
      <div className="space-y-3.5 pb-24 pt-1">
        {/* Search box on top ("Any NSE ticker") */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Any NSE ticker (e.g. INFY, TCS, TITAN)"
            inputMode="search"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-16 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 font-mono font-semibold focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-12 p-1 text-zinc-500 hover:text-zinc-300"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
          >
            GO
          </button>
        </form>

        {/* Segmented Control: "My portfolio" | "Watchlist" | "Pre-built" */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div
            role="group"
            aria-label="Research scope"
            className="inline-flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800"
          >
            <button
              type="button"
              onClick={() => handleScopeChange('portfolio')}
              className={`px-3 py-1.5 min-h-[44px] text-xs rounded-md touch-manipulation transition-all flex items-center justify-center ${
                scope === 'portfolio'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              My portfolio
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('watchlist')}
              className={`px-3 py-1.5 min-h-[44px] text-xs rounded-md touch-manipulation transition-all flex items-center justify-center ${
                scope === 'watchlist'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Watchlist
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('prebuilt')}
              className={`px-3 py-1.5 min-h-[44px] text-xs rounded-md touch-manipulation transition-all flex items-center justify-center ${
                scope === 'prebuilt'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Pre-built
            </button>
          </div>
        </div>

        {/* Count Line */}
        <div className="text-[11px] text-zinc-500 font-mono px-1">
          {fullReportCount} of {displayedList.length} have a full report
        </div>

        {/* Company List */}
        <div className="space-y-2">
          {displayedList.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-zinc-400">
                No stock matches &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => openDetail(searchQuery.trim().toUpperCase())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-medium text-zinc-200 border border-zinc-700"
              >
                <span>Build live research for {searchQuery.trim().toUpperCase()}</span>
              </button>
            </div>
          ) : (
            displayedList.map((c) => {
              const isPrebuilt = prebuiltSymbols.includes(c.symbol)
              const summary = prebuiltSummaries[c.symbol]

              return (
                <article
                  key={c.symbol}
                  onClick={() => openDetail(c.symbol)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 hover:bg-zinc-900/70 hover:border-zinc-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono font-bold text-zinc-100 text-sm tracking-tight">
                          {c.symbol}
                        </span>
                        <span className="text-[12px] text-zinc-400 truncate">
                          {c.name.replace(/ (Ltd|Limited)\.?$/i, '')}
                        </span>
                      </div>
                      {c.sector && (
                        <div className="text-[11px] text-zinc-500 mt-0.5">{c.sector}</div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isPrebuilt ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
                            Full report
                          </span>
                          {summary && (
                            <span className="text-[10px] text-zinc-400 font-mono text-right max-w-[160px] truncate">
                              {summary}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                          Financials only
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: RESEARCH DETAIL (Report View)
  // ==========================================
  const research = researchResult?.data
  const sourceDocs = research?.sources || []
  const isBuilding = research?.status === 'building'
  const isReady = research?.status === 'ready' || research?.status === 'partial'
  const isSampleData = research?.is_sample ?? true

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Back button to return to company list (preserves scope & search) */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 py-1 px-2 -ml-2 rounded-lg touch-manipulation transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-400" />
          <span>All companies</span>
        </button>
      </div>

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
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-zinc-100 font-mono tracking-tight">
                    {research.symbol}
                  </h1>
                  {research.name && (
                    <span className="text-xs text-zinc-400 font-medium">
                      {research.name}
                    </span>
                  )}
                  {isSampleData && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold tracking-wider uppercase">
                      SAMPLE DATA
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
                <button
                  type="button"
                  onClick={() => onAskFinn && onAskFinn(research.symbol, sourceDocs)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/70 text-[11px] font-mono font-medium transition-colors touch-manipulation"
                  title={`Ask FINN about ${research.symbol}`}
                >
                  <Bot className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Ask FINN</span>
                </button>
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

          {/* Gaps List at TOP for partial reports */}
          {research.status === 'partial' && (
            <section className="pt-0.5">
              <GapsList gaps={research.gaps} />
            </section>
          )}

          {/* Flagship: Promised vs Delivered Timeline */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Promised vs Delivered
                </h2>
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded-full">
                  {research.pvd.length}
                </span>
                {isSampleData && (
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-400 border border-amber-800/60">
                    SAMPLE DATA
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-500">Tap claim for verified quote</span>
            </div>

            <PvDTimeline
              items={research.pvd}
              sourceDocs={sourceDocs}
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
                        {formatDocSourceLabel(
                          claim.sources[0]?.doc_id,
                          claim.sources[0]?.page,
                          sourceDocs
                        )}
                      </span>
                    </div>
                    <div className="text-zinc-200 text-[12px] leading-snug font-medium">
                      {claim.text}
                    </div>
                  </div>
                ))}

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
                        {formatDocSourceLabel(
                          claim.sources[0]?.doc_id,
                          claim.sources[0]?.page,
                          sourceDocs
                        )}
                      </span>
                    </div>
                    <div className="text-zinc-200 text-[12px] leading-snug font-medium">
                      {claim.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gaps List at BOTTOM for ready reports */}
          {research.status !== 'partial' && (
            <section className="pt-1">
              <GapsList gaps={research.gaps} />
            </section>
          )}

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
        isSample={isSampleData}
        onClose={() => setSelectedClaim(null)}
      />
    </div>
  )
}
