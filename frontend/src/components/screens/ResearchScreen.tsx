import { readSavedResearch, useSavedResearch } from '@/lib/researchStorage'
import { verdictSummary } from '@/lib/researchSummary'
import { SavedResearch } from '@/components/research/SavedResearch'
import { PanelHeader, IdentityMark } from '@/components/ui/Desk'
import { WhoToCall } from '@/components/network/WhoToCall'
import { PriceChart } from '@/components/charts/PriceChart'
import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchResearchData,
  fetchSnapshotMeta,
  fetchCompaniesCatalog,
  CatalogCompany,
  ResearchResult,
} from '@/api/client'
import { Claim, SourceDoc } from '@/api/types'
import { formatInrCr, formatPercentDelta, formatDocSourceLabel, formatExactIst } from '@/lib/formatters'
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
  initialSymbol?: string
  onAskFinn?: (symbol: string, sourceDocs: SourceDoc[]) => void
}

export const ResearchScreen: React.FC<ResearchScreenProps> = ({ onAskFinn, initialSymbol }) => {
  // Navigation: selectedCompany null = Research Home list; string = Company Detail
  const [selectedCompany, setSelectedCompany] = useState<string | null>(() => {
    if (initialSymbol) return initialSymbol
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('company') || localStorage.getItem('finn.research.company') || null
    } catch {
      return null
    }
  })
  // remember the open report so a reload returns to it
  useEffect(() => {
    try {
      if (selectedCompany) localStorage.setItem('finn.research.company', selectedCompany)
      else localStorage.removeItem('finn.research.company')
    } catch {}
  }, [selectedCompany])
  const [searchQuery, setSearchQuery] = useState('')
  const [scope, setScope] = useState<ResearchScope>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const p = params.get('rscope') as ResearchScope
      if (p === 'prebuilt' || p === 'portfolio' || p === 'watchlist') return p
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
  const savedReports = useSavedResearch()
  const matchingSaved = savedReports.filter(({ data }) => `${data.symbol} ${data.name || ''}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))

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
            const summary = verdictSummary(res.data.pvd)
            if (summary) map[sym] = summary
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
    initialData: (): ResearchResult | undefined => {
      const saved = selectedCompany ? readSavedResearch(selectedCompany) : undefined
      return saved ? { data: saved.data, source: 'device', savedAt: saved.savedAt } : undefined
    },
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      if (!selectedCompany) return null
      return await fetchResearchData(selectedCompany)
    },
    enabled: Boolean(selectedCompany),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status === 'building' ? 2000 : false
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
    const sorted = list.filter(company => !savedReports.some(report => report.data.symbol === company.symbol)).sort((a, b) => {
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
  }, [catalog, scope, prebuiltSymbols, searchQuery, savedReports])

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
            placeholder="Search any NSE ticker"
            inputMode="search"
            className="w-full min-h-[44px] bg-zinc-900 border border-zinc-500 rounded-xl pl-9 pr-24 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 font-mono font-semibold focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-12 min-h-[44px] min-w-[44px] flex items-center justify-center p-1 text-zinc-500 hover:text-zinc-300"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1 min-h-[44px] min-w-[44px] px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg bg-brand hover:bg-brand-hover text-white shadow-sm transition-colors"
          >
            GO
          </button>
        </form>

        <SavedResearch reports={matchingSaved} onOpen={openDetail} />

        {/* Segmented Control: "My portfolio" | "Watchlist" | "Ready reports" */}
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
                  ? 'bg-brand-tint text-brand-text shadow-sm border border-brand/60 font-semibold'
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
                  ? 'bg-brand-tint text-brand-text shadow-sm border border-brand/60 font-semibold'
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
                  ? 'bg-brand-tint text-brand-text shadow-sm border border-brand/60 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ready reports
            </button>
          </div>
        </div>

        {/* Count Line */}
        <div className="text-[11px] text-zinc-500 font-mono px-1">
          {matchingSaved.length > 0 ? `${matchingSaved.length} saved on this device · ${displayedList.length} other companies` : `${fullReportCount} of ${displayedList.length} with guidance reviewed`}
        </div>

        {/* Company List */}
        <div className="space-y-2">
          {displayedList.length === 0 && matchingSaved.length > 0 ? <p className="py-3 text-xs text-zinc-400">Saved reports are listed above.</p> : displayedList.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-zinc-400">
                No stock matches &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => openDetail(searchQuery.trim().toUpperCase())}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-semibold text-zinc-200 border border-zinc-700"
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
                  className="rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.06)] dark:shadow-none p-3 hover:border-zinc-600 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <IdentityMark name={c.symbol} kind="company" symbol={c.symbol} />
                        <span className="font-mono font-semibold text-stock text-sm tracking-tight">
                          {c.symbol}
                        </span>
                        <span className="text-[12px] text-stock truncate">
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
                            Guidance reviewed
                          </span>
                          {summary && (
                            <span className="text-[11px] text-zinc-400 font-mono text-right max-w-[210px]">
                              {summary}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
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
    <div className="desk-screen">
      {/* Back button to return to company list (preserves scope & search) */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 py-1 px-2 -ml-2 rounded-lg touch-manipulation transition-colors font-semibold"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-400" />
          <span>All companies</span>
        </button>
      </div>

      {researchResult?.source === 'device' && researchResult.savedAt && <div className="desk-inset flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300" role="status">
        <span>Saved on this device · {formatExactIst(researchResult.savedAt)}</span>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="min-h-[44px] rounded border border-zinc-500 px-3 font-semibold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">Refresh</button>
      </div>}

      {(!research || research.status === 'failed') && <WhoToCall symbol={selectedCompany ?? ''} />}

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
          compact={Boolean(research.snapshot)}
        />
      )}

      {/* Report body: shown as soon as anything is ready, and fills in below while the build continues */}
      {(isReady || isBuilding) && research && (
        <div className="space-y-6">
          {/* Company & Financial Snapshot Header */}
          <div className="desk-panel space-y-3 p-3">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <IdentityMark name={research.symbol} kind="company" symbol={research.symbol} />
                  <h1 className="text-base font-semibold text-stock font-mono tracking-tight">
                    {research.symbol}
                  </h1>
                  {research.name && (
                    <span className="text-xs text-stock font-semibold">
                      {research.name}
                    </span>
                  )}
                  {isSampleData && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-semibold tracking-wider uppercase">
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
                  className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-sm transition-colors touch-manipulation"
                  title={`Ask FINN about ${research.symbol}`}
                >
                  <Bot className="w-3.5 h-3.5 text-white/90" />
                  <span>Ask FINN</span>
                </button>
                <span
                  className={`text-[11px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    isBuilding
                      ? 'text-amber-400 bg-amber-950/40 border-amber-800/60'
                      : 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
                  }`}
                >
                  {research.status}
                </span>
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="min-h-[44px] min-w-[44px] p-1 hover:text-zinc-200 text-zinc-500 transition-colors"
                  title="Refresh research"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-zinc-300' : ''}`} />
                </button>
              </div>
            </div>

            {/* Headline TTM Metrics */}
            {research.snapshot?.headline && (
              <div className="grid grid-cols-2 desk-data-grid">
                {research.snapshot.headline.map((h, i) => {
                  const yoy = formatPercentDelta(h.yoy_pct)
                  const isCr = h.unit === 'INR_CR'
                  return (
                    <div
                      key={i}
                      className="desk-metric"
                    >
                      <div className="text-[11px] uppercase font-semibold text-zinc-400 truncate">
                        {h.name}
                      </div>
                      <div className="text-base font-mono font-semibold text-zinc-100 tabular-nums mt-1">
                        {h.value !== null ? (isCr ? formatInrCr(h.value, 0) : `${h.value.toFixed(1)}%`) : '—'}
                      </div>
                      <div className="mt-0.5">
                        {h.yoy_pct !== null ? (
                          <span className={`text-[11px] font-mono tabular-nums font-semibold ${yoy.colorClass}`}>
                            <span className="mr-0.5">{yoy.arrow}</span>
                            {yoy.text}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-zinc-500">—</span>
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

          <PriceChart symbol={research.symbol} />
          <WhoToCall symbol={research.symbol} name={research.name} />

          {/* Gaps List at TOP for partial reports */}
          {(research.status === 'partial' || (isBuilding && research.gaps.length > 0)) && (
            <section className="pt-0.5">
              <GapsList gaps={research.gaps} />
            </section>
          )}

          {/* Flagship: Promised vs Delivered Timeline */}
          <section className="space-y-2.5">
            <PanelHeader title="Promised vs Delivered" count={research.pvd.length} code="RSH" helper="Tap claim for verified quote" />
            {isSampleData && <span className="text-[11px] text-amber-400">SAMPLE DATA</span>}

            {(research.pvd.length > 0 || !isBuilding) && (
              <PvDTimeline
                items={research.pvd}
                sourceDocs={sourceDocs}
                onSelectClaim={(claim, metricTitle) =>
                  setSelectedClaim({ claim, metricTitle })
                }
              />
            )}
            {isBuilding && (
              <div className="rounded-xl border border-dashed border-zinc-800 p-3 text-[11px] text-zinc-400 flex items-center gap-2 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {research.pvd.length === 0
                  ? 'Promises appear here as soon as each is checked against later calls.'
                  : 'Checking more promises against later calls…'}
              </div>
            )}
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
                      <span className="text-[11px] text-zinc-400 font-mono underline decoration-zinc-700">
                        {formatDocSourceLabel(
                          claim.sources[0]?.doc_id,
                          claim.sources[0]?.page,
                          sourceDocs
                        )}
                      </span>
                    </div>
                    <div className="text-zinc-200 text-[12px] leading-snug font-semibold">
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
                      <span className="text-[11px] text-zinc-400 font-mono underline decoration-zinc-700">
                        {formatDocSourceLabel(
                          claim.sources[0]?.doc_id,
                          claim.sources[0]?.page,
                          sourceDocs
                        )}
                      </span>
                    </div>
                    <div className="text-zinc-200 text-[12px] leading-snug font-semibold">
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
