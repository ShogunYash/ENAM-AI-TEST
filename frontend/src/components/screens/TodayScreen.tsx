import React, { useEffect, useState, useMemo } from 'react'
import { DigestResult } from '@/api/client'
import { Filing } from '@/api/types'
import { WindowOption } from '@/components/today/WindowPicker'
import { TodayToolbar, TodayViewOption } from '@/components/today/TodayToolbar'
import { HowToReadSheet } from '@/components/today/HowToReadSheet'
import { AlertsStrip } from '@/components/today/AlertsStrip'
import { FilingCard } from '@/components/cards/FilingCard'
import { RoutineGroup } from '@/components/today/RoutineGroup'
import { CompanyList } from '@/components/today/CompanyList'
import { CompanyDetail } from '@/components/today/CompanyDetail'
import { CheckCircle, Info } from 'lucide-react'

export type TodayScope = 'portfolio' | 'watchlist'

interface TodayScreenProps {
  digestResult: DigestResult | null
  isLoading: boolean
  isRefreshing: boolean
  windowOption: WindowOption
  onWindowChange: (val: WindowOption) => void
  onRefresh: () => void
  onAskFinn: (filing: Filing) => void
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  digestResult,
  isLoading,
  isRefreshing,
  windowOption,
  onWindowChange,
  onRefresh,
  onAskFinn,
}) => {
  const [highlightedFilingId, setHighlightedFilingId] = useState<string | null>(null)

  // Track universe scope: 'portfolio' (default) vs 'watchlist', persisted in localStorage
  const [scope, setScope] = useState<TodayScope>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const p = params.get('scope')
      if (p === 'watchlist' || p === 'portfolio') return p
      const saved = localStorage.getItem('finn.portfolioScope')
      if (saved === 'watchlist' || saved === 'portfolio') return saved
    } catch {}
    return 'portfolio'
  })

  // Track chosen view: 'priority' | 'company_important' | 'company_az'
  const [viewOption, setViewOption] = useState<TodayViewOption>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const v = params.get('view') as TodayViewOption
      if (v === 'priority' || v === 'company_important' || v === 'company_az') return v
      const saved = localStorage.getItem('finn.todayView') as TodayViewOption
      if (saved === 'priority' || saved === 'company_important' || saved === 'company_az') return saved
    } catch {}
    return 'priority'
  })

  // Selected company drilldown (supports ?company=<sym> URL param)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('company')
    } catch {
      return null
    }
  })

  // Search query state
  const [searchQuery, setSearchQuery] = useState('')

  // Scroll position preserved when drilling into a company and coming back
  const [savedScrollY, setSavedScrollY] = useState(0)

  // Help sheet state (supports ?help=true&helpSection=<section>)
  const [helpOpen, setHelpOpen] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('help') === 'true'
    } catch {
      return false
    }
  })
  const [helpSection, setHelpSection] = useState<'needs_you' | 'period' | 'view' | null>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('helpSection') as any
      if (p === 'needs_you' || p === 'period' || p === 'view') return p
    } catch {}
    return null
  })

  const openHelp = (section?: 'needs_you' | 'period' | 'view') => {
    setHelpSection(section || null)
    setHelpOpen(true)
  }

  // Effective view mode: Watchlist has no ranked digest, so defaults to by-company
  const effectiveView: TodayViewOption =
    scope === 'watchlist'
      ? viewOption === 'company_az'
        ? 'company_az'
        : 'company_important'
      : viewOption

  // Switching window always resets to the company list (not an open company)
  useEffect(() => {
    setSelectedSymbol(null)
  }, [windowOption])

  // Phone back gesture / browser back returns from a company to the list
  useEffect(() => {
    const onPop = () => setSelectedSymbol(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Restore scroll position after returning from company detail
  useEffect(() => {
    if (!selectedSymbol && savedScrollY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY)
      })
    }
  }, [selectedSymbol, savedScrollY])

  const openCompany = (symbol: string) => {
    const currentScroll = window.scrollY || document.documentElement.scrollTop || 0
    setSavedScrollY(currentScroll)
    window.history.pushState({ finnCompany: symbol }, '')
    setSelectedSymbol(symbol)
  }

  const closeCompany = () => {
    if (window.history.state?.finnCompany) window.history.back()
    else setSelectedSymbol(null)
  }

  const handleScopeChange = (newScope: TodayScope) => {
    setSelectedSymbol(null)
    setScope(newScope)
    try {
      localStorage.setItem('finn.portfolioScope', newScope)
    } catch {}
  }

  const handleViewChange = (newView: TodayViewOption) => {
    setSelectedSymbol(null)
    setViewOption(newView)
    try {
      localStorage.setItem('finn.todayView', newView)
    } catch {}
  }

  const handleSelectAlertFiling = (filingId: string) => {
    setHighlightedFilingId(filingId)
    const el = document.getElementById(`filing-${filingId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const digest = digestResult?.digest
  const needsYou = digest?.needs_you || []
  const alsoMaterial = digest?.also_material || []
  const routine = digest?.routine
  const alerts = digest?.alerts || []

  // Filter filings in Priority feed when search query is active
  const { filteredNeedsYou, filteredAlsoMaterial } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      return { filteredNeedsYou: needsYou, filteredAlsoMaterial: alsoMaterial }
    }
    const matches = (f: Filing) =>
      f.symbol.toLowerCase().includes(q) ||
      f.company_name?.toLowerCase().includes(q) ||
      f.headline.toLowerCase().includes(q) ||
      (f.so_what && f.so_what.toLowerCase().includes(q)) ||
      f.category.toLowerCase().includes(q)

    return {
      filteredNeedsYou: needsYou.filter(matches),
      filteredAlsoMaterial: alsoMaterial.filter(matches),
    }
  }, [needsYou, alsoMaterial, searchQuery])

  // Shared Toolbar component
  const toolbar = (
    <TodayToolbar
      scope={scope}
      onScopeChange={handleScopeChange}
      windowOption={windowOption}
      onWindowChange={onWindowChange}
      viewOption={effectiveView}
      onViewChange={handleViewChange}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      asOf={digestResult?.asOf || new Date().toISOString()}
      isLive={digestResult?.isLive}
      source={digestResult?.source}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      onOpenHelp={openHelp}
    />
  )

  // 1. Company Detail View (drilled into a stock)
  if (selectedSymbol) {
    return (
      <div className="space-y-3 pb-20">
        {toolbar}
        <CompanyDetail
          symbol={selectedSymbol}
          windowOption={windowOption}
          onBack={closeCompany}
          onAskFinn={onAskFinn}
        />
        <HowToReadSheet
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          initialSection={helpSection}
        />
      </div>
    )
  }

  // 2. Watchlist View (Always by-company)
  if (scope === 'watchlist') {
    return (
      <div className="space-y-3 pb-20">
        {toolbar}

        {/* Clear banner distinguishing watchlist from portfolio holdings */}
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span>Not in your portfolio — filings only, no alerts</span>
        </div>

        <CompanyList
          scope="watchlist"
          windowOption={windowOption}
          onSelect={openCompany}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortMode={effectiveView === 'company_az' ? 'az' : 'importance'}
          hideHeaderControls={true}
        />

        <HowToReadSheet
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          initialSection={helpSection}
        />
      </div>
    )
  }

  // 3. Portfolio By-Company View
  if (effectiveView === 'company_important' || effectiveView === 'company_az') {
    return (
      <div className="space-y-3 pb-20">
        {toolbar}

        <CompanyList
          scope="portfolio"
          windowOption={windowOption}
          onSelect={openCompany}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortMode={effectiveView === 'company_az' ? 'az' : 'importance'}
          hideHeaderControls={true}
        />

        <HowToReadSheet
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          initialSection={helpSection}
        />
      </div>
    )
  }

  // 4. Portfolio Priority Feed (Ranked View)
  if (isLoading && !digestResult) {
    return (
      <div className="space-y-3 pb-20">
        {toolbar}
        <div className="space-y-3 animate-pulse p-4">
          <div className="h-8 bg-zinc-900 rounded-lg w-48"></div>
          <div className="h-16 bg-zinc-900 rounded-xl"></div>
          <div className="h-44 bg-zinc-900 rounded-xl"></div>
          <div className="h-44 bg-zinc-900 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-20">
      {toolbar}

      {/* Alerts Strip (Ranked view only, hidden when search is active) */}
      {!searchQuery && alerts.length > 0 && (
        <AlertsStrip alerts={alerts} onSelectFiling={handleSelectAlertFiling} />
      )}

      {/* Search results notice when searching in Priority view */}
      {searchQuery && (
        <div className="text-[11px] text-zinc-400 font-mono px-1">
          {filteredNeedsYou.length + filteredAlsoMaterial.length} results matching &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      {/* "Needs you" Stack */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <span>Needs you</span>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded-full">
              {filteredNeedsYou.length} / 5
            </span>
            <button
              type="button"
              onClick={() => openHelp('needs_you')}
              className="w-4 h-4 rounded-full border border-zinc-700/80 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold inline-flex items-center justify-center transition-colors touch-manipulation ml-0.5"
              title="What is Needs you?"
              aria-label="What is Needs you?"
            >
              ?
            </button>
          </div>
          <span className="text-[11px] text-zinc-400">ranked by priority score</span>
        </div>

        {filteredNeedsYou.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center space-y-2 bg-zinc-900/30">
            <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" />
            <div className="text-sm font-medium text-zinc-300">
              {searchQuery ? `No key filings match "${searchQuery}"` : `Nothing material in the last ${windowOption}`}
            </div>
            <p className="text-xs text-zinc-400">
              {routine?.count ? `${routine.count} routine filings collapsed below.` : 'Your portfolio is clear.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNeedsYou.slice(0, 5).map((filing) => (
              <FilingCard
                key={filing.id}
                filing={filing}
                onAskFinn={onAskFinn}
                highlight={highlightedFilingId === filing.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Also Material (if any additional high/medium filings) */}
      {filteredAlsoMaterial.length > 0 && (
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Also Material ({filteredAlsoMaterial.length})
            </h2>
          </div>
          <div className="space-y-3">
            {filteredAlsoMaterial.map((filing) => (
              <FilingCard
                key={filing.id}
                filing={filing}
                onAskFinn={onAskFinn}
                highlight={highlightedFilingId === filing.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Routine (n) Collapsed Group (hidden during active search) */}
      {!searchQuery && routine && routine.count > 0 && (
        <section className="pt-1">
          <RoutineGroup routine={routine} />
        </section>
      )}

      {/* Help Sheet */}
      <HowToReadSheet
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        initialSection={helpSection}
      />
    </div>
  )
}
