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
import { Inbox, CheckCircle } from 'lucide-react'

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

  // 30d is shown BY COMPANY (one row per stock -> that stock's own headlines); 24h / 3d / 7d keep the single ranked list.
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const byCompany = windowOption === '30d'

  useEffect(() => {
    setSelectedSymbol(null) // changing the window always returns to the list
  }, [windowOption])

  useEffect(() => {
    // Phone back gesture / browser back returns from a company to the list instead of leaving the app.
    const onPop = () => setSelectedSymbol(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openCompany = (symbol: string) => {
    window.history.pushState({ finnCompany: symbol }, '')
    setSelectedSymbol(symbol)
  }
  const closeCompany = () => {
    if (window.history.state?.finnCompany) window.history.back()
    else setSelectedSymbol(null)
  }

  const handleSelectAlertFiling = (filingId: string) => {
    setHighlightedFilingId(filingId)
    const el = document.getElementById(`filing-${filingId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  if (byCompany) {
    return (
      <div className="space-y-4 pb-20">
        <div className="flex items-center justify-between gap-2 pt-1 pb-1">
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
        {selectedSymbol ? (
          <CompanyDetail symbol={selectedSymbol} windowOption={windowOption} onBack={closeCompany} onAskFinn={onAskFinn} />
        ) : (
          <CompanyList windowOption={windowOption} onSelect={openCompany} />
        )}
      </div>
    )
  }

  if (isLoading && !digestResult) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-8 bg-zinc-900 rounded-lg w-48"></div>
        <div className="h-16 bg-zinc-900 rounded-xl"></div>
        <div className="h-44 bg-zinc-900 rounded-xl"></div>
        <div className="h-44 bg-zinc-900 rounded-xl"></div>
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
      {/* Top Header Controls: Window Picker & As Of Chip */}
      <div className="flex items-center justify-between gap-2 pt-1 pb-1">
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

      {/* Alerts Strip */}
      {alerts.length > 0 && (
        <AlertsStrip alerts={alerts} onSelectFiling={handleSelectAlertFiling} />
      )}

      {/* "Needs you" Stack (at most 5 filings) */}
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
