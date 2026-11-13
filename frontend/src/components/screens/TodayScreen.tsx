import React, { useEffect, useState } from 'react'
import { DigestResult } from '@/api/client'
import { Filing } from '@/api/types'
import { WindowPicker, WindowOption } from '@/components/today/WindowPicker'
import { AlertsStrip } from '@/components/today/AlertsStrip'
import { FilingCard } from '@/components/cards/FilingCard'
import { RoutineGroup } from '@/components/today/RoutineGroup'
import { CompanyList } from '@/components/today/CompanyList'
import { CompanyDetail } from '@/components/today/CompanyDetail'
import { AsOfChip } from '@/components/common/AsOfChip'
import { CheckCircle, Info } from 'lucide-react'

export const BY_COMPANY_WINDOWS: WindowOption[] = ['3d', '7d', '30d']
export const TOGGLE_WINDOWS: WindowOption[] = ['3d', '7d']
export type ViewMode = 'ranked' | 'by_company'
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
      const saved = localStorage.getItem('finn.portfolioScope')
      if (saved === 'watchlist' || saved === 'portfolio') return saved
    } catch {}
    return 'portfolio'
  })

  // Track chosen view per window (persisted in localStorage key finn.viewMode.<window>)
  const [viewModes, setViewModes] = useState<Record<string, ViewMode>>(() => {
    const initial: Record<string, ViewMode> = {}
    TOGGLE_WINDOWS.forEach((win) => {
      try {
        const saved = localStorage.getItem(`finn.viewMode.${win}`)
        if (saved === 'by_company' || saved === 'ranked') {
          initial[win] = saved
        }
      } catch {}
    })
    return initial
  })

  // Selected company drilldown in By company view
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)

  // Search text kept when drilling into a company and coming back
  const [companySearch, setCompanySearch] = useState('')

  // Scroll position preserved when drilling into a company and coming back
  const [savedScrollY, setSavedScrollY] = useState(0)

  // Resolve effective view mode
  const isToggleWindow = TOGGLE_WINDOWS.includes(windowOption)
  const effectiveView: ViewMode =
    windowOption === '30d'
      ? 'by_company'
      : windowOption === '24h'
      ? 'ranked'
      : viewModes[windowOption] || 'ranked'

  // Switching window always resets to the company list (not an open company)
  useEffect(() => {
    setSelectedSymbol(null)
  }, [windowOption])

  // Phone back gesture / browser back returns from a company to the list instead of leaving the app
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

  const handleViewChange = (mode: ViewMode) => {
    setSelectedSymbol(null) // switching view resets to the list
    setViewModes((prev) => ({ ...prev, [windowOption]: mode }))
    try {
      localStorage.setItem(`finn.viewMode.${windowOption}`, mode)
    } catch {}
  }

  const handleSelectAlertFiling = (filingId: string) => {
    setHighlightedFilingId(filingId)
    const el = document.getElementById(`filing-${filingId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Scope selector segmented control (>= 44px tap target, same style as WindowPicker)
  const scopeControl = (
    <div className="flex items-center justify-between gap-2 pt-0.5 pb-0.5">
      <div
        role="group"
        aria-label="Universe scope"
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
      </div>
    </div>
  )

  const headerBar = (
    <>
      {scopeControl}
      <div className="flex items-center justify-between gap-2 pt-0.5 pb-1">
        <WindowPicker selected={windowOption} onChange={onWindowChange} />

        {digestResult && (
          <AsOfChip
            asOf={digestResult.asOf}
            isLive={digestResult.isLive}
            source={digestResult.source}
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        )}
      </div>
    </>
  )

  // View toggle element (only on 3d and 7d in Portfolio mode)
  const viewToggle = isToggleWindow && scope === 'portfolio' && (
    <div className="flex items-center justify-start pt-0.5 pb-0.5">
      <div
        role="group"
        aria-label="View mode"
        className="inline-flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800"
      >
        <button
          type="button"
          onClick={() => handleViewChange('ranked')}
          className={`px-3 py-1.5 min-h-[44px] text-xs rounded-md touch-manipulation transition-all flex items-center justify-center ${
            effectiveView === 'ranked'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Ranked
        </button>
        <button
          type="button"
          onClick={() => handleViewChange('by_company')}
          className={`px-3 py-1.5 min-h-[44px] text-xs rounded-md touch-manipulation transition-all flex items-center justify-center ${
            effectiveView === 'by_company'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          By company
        </button>
      </div>
    </div>
  )

  // 1. Watchlist View (Always by-company, filtered to in_portfolio=false, for whichever window)
  if (scope === 'watchlist') {
    return (
      <div className="space-y-4 pb-20">
        {headerBar}

        {/* Clear banner distinguishing watchlist from portfolio holdings */}
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span>Not in your portfolio — filings only, no alerts</span>
        </div>

        {selectedSymbol ? (
          <CompanyDetail
            symbol={selectedSymbol}
            windowOption={windowOption}
            onBack={closeCompany}
            onAskFinn={onAskFinn}
          />
        ) : (
          <CompanyList
            scope="watchlist"
            windowOption={windowOption}
            onSelect={openCompany}
            searchQuery={companySearch}
            onSearchChange={setCompanySearch}
          />
        )}
      </div>
    )
  }

  // 2. Portfolio By Company View: (30d always, or 3d/7d when By company is selected)
  if (effectiveView === 'by_company') {
    return (
      <div className="space-y-4 pb-20">
        {headerBar}
        {viewToggle}

        {selectedSymbol ? (
          <CompanyDetail
            symbol={selectedSymbol}
            windowOption={windowOption}
            onBack={closeCompany}
            onAskFinn={onAskFinn}
          />
        ) : (
          <CompanyList
            scope="portfolio"
            windowOption={windowOption}
            onSelect={openCompany}
            searchQuery={companySearch}
            onSearchChange={setCompanySearch}
          />
        )}
      </div>
    )
  }

  // 3. Portfolio Ranked View:
  if (isLoading && !digestResult) {
    return (
      <div className="space-y-4 pb-20">
        {headerBar}
        <div className="space-y-4 animate-pulse p-4">
          <div className="h-8 bg-zinc-900 rounded-lg w-48"></div>
          <div className="h-16 bg-zinc-900 rounded-xl"></div>
          <div className="h-44 bg-zinc-900 rounded-xl"></div>
          <div className="h-44 bg-zinc-900 rounded-xl"></div>
        </div>
      </div>
    )
  }

  const digest = digestResult?.digest
  const needsYou = digest?.needs_you || []
  const alsoMaterial = digest?.also_material || []
  const routine = digest?.routine
  const alerts = digest?.alerts || []

  return (
    <div className="space-y-4 pb-20">
      {headerBar}
      {viewToggle}

      {/* Alerts Strip (Ranked view only) */}
      {alerts.length > 0 && (
        <AlertsStrip alerts={alerts} onSelectFiling={handleSelectAlertFiling} />
      )}

      {/* "Needs you" Stack (at most 5 filings, Ranked view only) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <span>Needs you</span>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded-full">
              {needsYou.length} / 5
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">ranked by priority score</span>
        </div>

        {needsYou.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center space-y-2 bg-zinc-900/30">
            <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" />
            <div className="text-sm font-medium text-zinc-300">
              Nothing material in the last {windowOption}
            </div>
            <p className="text-xs text-zinc-400">
              {routine?.count ? `${routine.count} routine filings collapsed below.` : 'Your portfolio is clear.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {needsYou.slice(0, 5).map((filing) => (
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
      {alsoMaterial.length > 0 && (
        <section className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Also Material ({alsoMaterial.length})
            </h2>
          </div>
          <div className="space-y-3">
            {alsoMaterial.map((filing) => (
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

      {/* Routine (n) Collapsed Group */}
      {routine && routine.count > 0 && (
        <section className="pt-2">
          <RoutineGroup routine={routine} />
        </section>
      )}
    </div>
  )
}
