import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCompanyList } from '@/api/client'
import { CompanySummary } from '@/api/types'
import { useSettings } from '@/lib/settings'
import { formatPercentDelta, formatVolumeMultiple, formatRelativeIst, formatCategory } from '@/lib/formatters'
import { ChevronRight } from 'lucide-react'

interface CompanyListProps {
  windowOption: string
  onSelect: (symbol: string) => void
}

const label = formatCategory

const Row: React.FC<{ c: CompanySummary; onSelect: (symbol: string) => void }> = ({ c, onSelect }) => {
  const quiet = c.total === 0
  const delta = c.price ? formatPercentDelta(c.price.pct_1d) : null
  const cats = Object.entries(c.categories).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const top = c.top
  return (
    <button
      type="button"
      onClick={() => onSelect(c.symbol)}
      aria-label={`${c.name}: ${c.total} filings, ${c.material} material. Open`}
      className={`w-full text-left rounded-xl border p-3.5 min-h-[88px] touch-manipulation transition-colors ${
        quiet
          ? 'border-zinc-800/60 bg-zinc-900/30 opacity-70'
          : 'border-zinc-800/90 bg-zinc-900/80 hover:border-zinc-700/80 active:bg-zinc-900'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="font-mono font-bold text-zinc-100 tracking-tight">{c.symbol}</span>
          <span className="text-[12px] text-zinc-400 truncate">{c.name.replace(/ (Ltd|Limited)\.?$/i, '')}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {delta && c.price && (
            <span className={`text-[11px] font-mono ${delta.colorClass}`} title={`Latest session, volume ${formatVolumeMultiple(c.price.vol_ratio)} average`}>
              {delta.arrow}
              {delta.text}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[11px]">
        {quiet ? (
          <span className="text-zinc-500">No filings in this window</span>
        ) : (
          <>
            {c.material > 0 ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium">
                {c.material} material
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50 text-zinc-400">
                routine only
              </span>
            )}
            <span className="text-zinc-500">{c.total} filings</span>
            {cats.map(([cat, n]) => (
              <span key={cat} className="px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700/50 text-zinc-300">
                {label(cat)} {n > 1 ? `×${n}` : ''}
              </span>
            ))}
          </>
        )}
      </div>

      {top && (
        <div className="mt-2 text-[13px] text-zinc-200 leading-snug line-clamp-2">
          {top.so_what || top.headline}
          <span className="text-zinc-500 text-[11px] ml-1.5">· {formatRelativeIst(top.filed_at)}</span>
        </div>
      )}
    </button>
  )
}

export const CompanyList: React.FC<CompanyListProps> = ({ windowOption, onSelect }) => {
  const { settings } = useSettings()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['companies', windowOption, settings.volume_multiple, settings.price_move_pct, settings.categories_of_interest.join(','), settings.muted_categories.join(',')],
    queryFn: () => getCompanyList(windowOption, settings),
  })

  if (isLoading) {
    return (
      <div className="space-y-2.5 animate-pulse" aria-busy="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-[88px] bg-zinc-900 rounded-xl" />
        ))}
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center space-y-2 bg-zinc-900/30">
        <div className="text-sm font-medium text-zinc-300">Couldn't load the company view</div>
        <button type="button" onClick={() => refetch()} className="text-xs text-zinc-300 underline min-h-[44px]">
          Try again
        </button>
      </div>
    )
  }

  const rows = data.data.companies
  const active = rows.filter((c) => c.total > 0).length
  return (
    <section className="space-y-2.5" aria-label="Companies">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Your companies</h2>
        <span className="text-[11px] text-zinc-400">
          {active} of {rows.length} filed in {windowOption} · most important first
        </span>
      </div>
      {rows.map((c) => (
        <Row key={c.symbol} c={c} onSelect={onSelect} />
      ))}
    </section>
  )
}
