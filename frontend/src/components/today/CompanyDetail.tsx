import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCompanyFilings } from '@/api/client'
import { Filing } from '@/api/types'
import { useSettings } from '@/lib/settings'
import { FilingCard } from '@/components/cards/FilingCard'
import { RoutineGroup } from '@/components/today/RoutineGroup'
import { ArrowLeft, CheckCircle } from 'lucide-react'

interface CompanyDetailProps {
  symbol: string
  windowOption: string
  onBack: () => void
  onAskFinn: (filing: Filing) => void
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ symbol, windowOption, onBack, onAskFinn }) => {
  const { settings } = useSettings()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['company', symbol, windowOption, settings.volume_multiple, settings.price_move_pct, settings.categories_of_interest.join(','), settings.muted_categories.join(',')],
    queryFn: () => getCompanyFilings(symbol, windowOption, settings),
  })

  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [symbol])

  const header = (
    <div className="flex items-center gap-2 pb-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to all companies"
        className="flex items-center gap-1 min-h-[44px] pr-3 -ml-1 text-sm text-zinc-300 hover:text-zinc-100 touch-manipulation"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All companies</span>
      </button>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse" aria-busy="true">
        {header}
        <div className="h-7 bg-zinc-900 rounded w-56" />
        <div className="h-40 bg-zinc-900 rounded-xl" />
        <div className="h-40 bg-zinc-900 rounded-xl" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="space-y-3">
        {header}
        <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center space-y-2 bg-zinc-900/30">
          <div className="text-sm font-medium text-zinc-300">Couldn't load {symbol}'s filings</div>
          <button type="button" onClick={() => refetch()} className="text-xs text-zinc-300 underline min-h-[44px]">
            Try again
          </button>
        </div>
      </div>
    )
  }

  const c = data.data
  return (
    <div className="space-y-4 pb-20">
      {header}
      <div className="px-1 space-y-0.5">
        <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
          <span className="font-mono text-stock">{c.symbol}</span>
          <span className="text-stock font-normal text-sm ml-2">{c.name.replace(/ (Ltd|Limited)\.?$/i, '')}</span>
        </h1>
        <p className="text-[12px] text-zinc-400">
          {c.counts.total} filings in the last {windowOption} · {c.important.length} important
          {c.routine.count > 0 ? ` · ${c.routine.count} routine` : ''}
        </p>
      </div>

      <section className="space-y-2.5">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Important ({c.important.length})
        </h2>
        {c.important.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center space-y-2 bg-zinc-900/30">
            <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" />
            <div className="text-sm font-medium text-zinc-300">Nothing material from {c.symbol}</div>
            <p className="text-xs text-zinc-400">
              {c.routine.count > 0 ? `${c.routine.count} routine filings are collapsed below.` : 'No filings in this window.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {c.important.map((f) => (
              <FilingCard key={f.id} filing={f} onAskFinn={onAskFinn} />
            ))}
          </div>
        )}
      </section>

      {c.routine.count > 0 && (
        <section className="pt-1">
          <RoutineGroup routine={c.routine} />
        </section>
      )}
    </div>
  )
}
