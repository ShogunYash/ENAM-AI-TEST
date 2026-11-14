import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCompanyList } from '@/api/client'
import { CompanySummary } from '@/api/types'
import { useSettings } from '@/lib/settings'
import {
  formatPercentDelta,
  formatVolumeMultiple,
  formatRelativeIst,
  formatCategory,
  getCategoryBadgeClasses,
} from '@/lib/formatters'
import { ChevronRight, Search, X, CheckCircle } from 'lucide-react'

export type CompanySortOption = 'importance' | 'az'

interface CompanyListProps {
  scope?: 'portfolio' | 'watchlist'
  windowOption: string
  onSelect: (symbol: string) => void
  searchQuery?: string
  onSearchChange?: (val: string) => void
  sortMode?: CompanySortOption
  hideHeaderControls?: boolean
}

const label = formatCategory

const Row: React.FC<{
  c: CompanySummary
  windowOption: string
  onSelect: (symbol: string) => void
}> = ({ c, windowOption, onSelect }) => {
  const quiet = c.total === 0
  const delta = c.price ? formatPercentDelta(c.price.pct_1d) : null
  const cats = Object.entries(c.categories).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const top = c.top
  return (
    <button
      type="button"
      onClick={() => onSelect(c.symbol)}
      aria-label={`${c.name}: ${c.total} filings, ${c.material} material. Open`}
      className={`w-full text-left rounded-xl border p-3.5 min-h-[88px] touch-manipulation transition-all shadow-[0_1px_2px_rgba(16,24,40,0.06)] dark:shadow-none ${
        quiet
          ? 'border-zinc-700/50 bg-zinc-900/40 opacity-70'
          : 'border-zinc-700/80 bg-zinc-900 hover:border-zinc-600'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="font-mono font-bold text-stock tracking-tight">{c.symbol}</span>
          <span className="text-[12px] text-stock truncate">{c.name.replace(/ (Ltd|Limited)\.?$/i, '')}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {delta && c.price && (
            <div className="flex items-center gap-1 font-mono text-[11px]" title={`Latest session, volume ${formatVolumeMultiple(c.price.vol_ratio)} average`}>
              <span className={delta.colorClass}>
                {delta.arrow}
                {delta.text}
              </span>
              <span className="text-zinc-500 text-[10px]">({windowOption})</span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </div>
      </div>

      {/* 2. One-line material event summary (moved above category chips) */}
      {top && (
        <div className="mt-2 text-[13px] text-zinc-200 leading-snug line-clamp-2 font-medium">
          {top.so_what || top.headline}
          <span className="text-zinc-500 text-[11px] ml-1.5 font-normal">· {formatRelativeIst(top.filed_at)}</span>
        </div>
      )}

      {/* 3. Category chips and filing count */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px]">
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
              <span
                key={cat}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryBadgeClasses(cat)}`}
              >
                {label(cat)} {n > 1 ? `×${n}` : ''}
              </span>
            ))}
          </>
        )}
      </div>
    </button>
  )
}

export const CompanyList: React.FC<CompanyListProps> = ({
  scope = 'portfolio',
  windowOption,
  onSelect,
  searchQuery,
  onSearchChange,
  sortMode: sortModeProp,
  hideHeaderControls = false,
}) => {
  const { settings } = useSettings()

  // Sort state persisted in localStorage (key finn.companySort)
  const [internalSortMode, setInternalSortMode] = useState<CompanySortOption>(() => {
    try {
      const saved = localStorage.getItem('finn.companySort')
      if (saved === 'az' || saved === 'importance') return saved
    } catch {}
    return 'importance'
  })

  const effectiveSort = sortModeProp || internalSortMode

  // Search input state with ~150ms debounce
  const [searchInput, setSearchInput] = useState(searchQuery || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery || '')

  useEffect(() => {
    if (searchQuery !== undefined && searchQuery !== searchInput) {
      setSearchInput(searchQuery)
      setDebouncedSearch(searchQuery)
    }
  }, [searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
      if (onSearchChange) {
        onSearchChange(searchInput)
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [searchInput, onSearchChange])

  const handleSortChange = (newSort: CompanySortOption) => {
    setInternalSortMode(newSort)
    try {
      localStorage.setItem('finn.companySort', newSort)
    } catch {}
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['companies', windowOption, settings.volume_multiple, settings.price_move_pct, settings.categories_of_interest.join(','), settings.muted_categories.join(',')],
    queryFn: () => getCompanyList(windowOption, settings),
  })

  const raw = data?.data?.companies || []
  const rows = useMemo(() => {
    if (scope === 'watchlist') {
      return raw.filter((c) => !c.in_portfolio)
    }
    return raw.filter((c) => c.in_portfolio !== false)
  }, [raw, scope])

  // 1. Live Filter (case-insensitive across symbol, name, and sector)
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((c) => {
      const matchSym = c.symbol.toLowerCase().includes(q)
      const matchName = c.name.toLowerCase().includes(q)
      const matchSector = c.sector ? c.sector.toLowerCase().includes(q) : false
      return matchSym || matchName || matchSector
    })
  }, [rows, debouncedSearch])

  // 2. Client-side Sort (Important first = API order; A-Z = alphabetical by symbol)
  // In A-Z, companies with no filings stay in place alphabetically
  const filteredAndSorted = useMemo(() => {
    if (effectiveSort === 'az') {
      return [...filtered].sort((a, b) => a.symbol.localeCompare(b.symbol))
    }
    return filtered
  }, [filtered, effectiveSort])

  if (isLoading) {
    return (
      <div className="space-y-2.5 animate-pulse" aria-busy="true">
        <div className="h-11 bg-zinc-900 rounded-xl" />
        <div className="h-11 bg-zinc-900 rounded-lg w-48" />
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

  const activeTotal = rows.filter((c) => c.total > 0).length

  return (
    <section className="space-y-3" aria-label="Companies">
      {hideHeaderControls ? (
        <div className="text-[11px] text-zinc-500 font-mono px-1">
          {debouncedSearch.trim()
            ? `${filteredAndSorted.length} of ${rows.length} matching`
            : `${activeTotal} of ${rows.length} filed in ${windowOption}`}
        </div>
      ) : (
        <>
          {/* Search Input Box */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              inputMode="search"
              autoFocus={false}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search stock or sector"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-10 py-2.5 min-h-[44px] text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="absolute right-1 p-2 text-zinc-400 hover:text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Options Segmented Control & Count */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div
              role="group"
              aria-label="Sort companies"
              className="inline-flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800"
            >
              <button
                type="button"
                onClick={() => handleSortChange('importance')}
                className={`px-3 py-1.5 min-h-[44px] text-xs rounded-md touch-manipulation transition-all flex items-center justify-center ${
                  effectiveSort === 'importance'
                    ? 'bg-brand-tint text-stock shadow-sm border border-[#667389] dark:border-[#7C8AA8] font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Important first
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('az')}
                className={`px-3 py-1.5 min-h-[44px] text-xs rounded-md touch-manipulation transition-all flex items-center justify-center ${
                  effectiveSort === 'az'
                    ? 'bg-brand-tint text-stock shadow-sm border border-[#667389] dark:border-[#7C8AA8] font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                A–Z
              </button>
            </div>

            {/* Row count line */}
            <span className="text-[11px] text-zinc-400 font-mono">
              {debouncedSearch.trim()
                ? `${filteredAndSorted.length} of ${rows.length} matching`
                : `${activeTotal} of ${rows.length} filed in ${windowOption}`}
            </span>
          </div>
        </>
      )}

      {/* Empty State when no companies filed in window */}
      {activeTotal === 0 && !debouncedSearch.trim() && (
        <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center space-y-2 bg-zinc-900/30">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
          <div className="text-sm font-medium text-zinc-300">
            No filings in {windowOption} for these companies
          </div>
          <p className="text-xs text-zinc-400">
            All {rows.length} {scope === 'watchlist' ? 'watchlist' : 'portfolio'} companies are quiet in this window.
          </p>
        </div>
      )}

      {/* Empty Search State */}
      {filteredAndSorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center space-y-3 bg-zinc-900/30">
          <div className="text-sm font-medium text-zinc-300">
            No stock matches "{debouncedSearch.trim()}"
          </div>
          <button
            type="button"
            onClick={() => setSearchInput('')}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 touch-manipulation transition-colors inline-flex items-center justify-center"
          >
            Clear search
          </button>
        </div>
      ) : (
        /* Company Rows */
        <div className="space-y-2.5">
          {filteredAndSorted.map((c) => (
            <Row key={c.symbol} c={c} windowOption={windowOption} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  )
}
