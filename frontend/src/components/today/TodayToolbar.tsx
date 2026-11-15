import React, { useState, useRef, useEffect } from 'react'
import { WindowOption } from './WindowPicker'
import { TodayScope } from '@/components/screens/TodayScreen'
import { AsOfChip } from '@/components/common/AsOfChip'
import { ChevronDown, Search, Info, X, Check } from 'lucide-react'

export type TodayViewOption = 'priority' | 'company_important' | 'company_az'

interface TodayToolbarProps {
  scope: TodayScope
  onScopeChange: (scope: TodayScope) => void
  windowOption: WindowOption
  onWindowChange: (val: WindowOption) => void
  viewOption: TodayViewOption
  onViewChange: (view: TodayViewOption) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  asOf: string
  isLive?: boolean
  source?: 'live' | 'snapshot'
  isRefreshing?: boolean
  onRefresh?: () => void
  onOpenHelp: (section?: 'needs_you' | 'period' | 'view') => void
}

const PERIOD_OPTIONS: { id: WindowOption; label: string; chipLabel: string }[] = [
  { id: '24h', label: '24 hours', chipLabel: '24h' },
  { id: '3d', label: '3 days', chipLabel: '3d' },
  { id: '7d', label: '7 days', chipLabel: '7d' },
  { id: '30d', label: '30 days (all)', chipLabel: '30d' },
]

export const TodayToolbar: React.FC<TodayToolbarProps> = ({
  scope,
  onScopeChange,
  windowOption,
  onWindowChange,
  viewOption,
  onViewChange,
  searchQuery,
  onSearchChange,
  asOf,
  isLive,
  source,
  isRefreshing,
  onRefresh,
  onOpenHelp,
}) => {
  const [periodOpen, setPeriodOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(Boolean(searchQuery))
  const searchInputRef = useRef<HTMLInputElement>(null)

  const periodMenuRef = useRef<HTMLDivElement>(null)
  const viewMenuRef = useRef<HTMLDivElement>(null)

  // Auto-focus search input when expanded
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodMenuRef.current && !periodMenuRef.current.contains(e.target as Node)) {
        setPeriodOpen(false)
      }
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Resolve active chip labels
  const currentPeriod = PERIOD_OPTIONS.find((p) => p.id === windowOption) || PERIOD_OPTIONS[0]
  const currentViewLabel =
    viewOption === 'priority'
      ? 'Priority'
      : viewOption === 'company_important'
      ? 'Companies'
      : 'A-Z'

  return (
    <div className="space-y-2 pb-1">
      {/* Row 1: [My portfolio | Watchlist] + LIVE/SNAPSHOT Chip */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        {/* Segmented Control */}
        <div
          role="group"
          aria-label="Universe scope"
          className="inline-flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-500"
        >
          <button
            type="button"
            onClick={() => onScopeChange('portfolio')}
            className={`px-2.5 py-1.5 min-h-[44px] text-xs whitespace-nowrap rounded-md touch-manipulation transition-all flex items-center justify-center ${
              scope === 'portfolio'
                ? 'bg-brand-tint text-brand-text shadow-sm border border-brand-text font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            My portfolio
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('watchlist')}
            className={`px-2.5 py-1.5 min-h-[44px] text-xs whitespace-nowrap rounded-md touch-manipulation transition-all flex items-center justify-center ${
              scope === 'watchlist'
                ? 'bg-brand-tint text-brand-text shadow-sm border border-brand-text font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Watchlist
          </button>
        </div>

        {/* As Of Status Chip on same row */}
        <AsOfChip
          asOf={asOf}
          isLive={isLive}
          source={source}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      </div>

      {/* Row 2: [Period: 24h v] [View: Priority v] [search icon] [(i) icon] */}
      <div className="flex items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          {/* Period Dropdown */}
          <div className="relative" ref={periodMenuRef}>
            <button
              type="button"
              onClick={() => {
                setPeriodOpen((prev) => !prev)
                setViewOpen(false)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-500 text-zinc-200 hover:border-zinc-500 font-mono text-[11px] font-medium touch-manipulation transition-colors"
              aria-expanded={periodOpen}
              aria-haspopup="true"
            >
              <span className="text-zinc-500 font-sans">Period:</span>
              <span className="font-bold text-zinc-100">{currentPeriod.chipLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 -mr-0.5" />
            </button>

            {periodOpen && (
              <div
                role="menu"
                className="absolute left-0 mt-1.5 w-44 rounded-xl bg-zinc-900/95 border border-zinc-800 shadow-2xl py-1 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              >
                {PERIOD_OPTIONS.map((opt) => {
                  const isSelected = windowOption === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onWindowChange(opt.id)
                        setPeriodOpen(false)
                      }}
                      className={`w-full min-h-[44px] px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-zinc-800/80 transition-colors ${
                        isSelected ? 'text-emerald-400 font-semibold' : 'text-zinc-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* View Dropdown */}
          <div className="relative" ref={viewMenuRef}>
            <button
              type="button"
              onClick={() => {
                setViewOpen((prev) => !prev)
                setPeriodOpen(false)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg bg-zinc-900 border border-zinc-500 text-zinc-200 hover:border-zinc-500 text-[11px] font-medium touch-manipulation transition-colors"
              aria-expanded={viewOpen}
              aria-haspopup="true"
            >
              <span className="text-zinc-500">View:</span>
              <span className="font-semibold text-zinc-100">{currentViewLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 -mr-0.5" />
            </button>

            {viewOpen && (
              <div
                role="menu"
                className="absolute left-0 mt-1.5 w-56 rounded-xl bg-zinc-900/95 border border-zinc-800 shadow-2xl py-1 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              >
                {/* Priority feed (disabled in Watchlist) */}
                <button
                  type="button"
                  disabled={scope === 'watchlist'}
                  onClick={() => {
                    if (scope !== 'watchlist') {
                      onViewChange('priority')
                      setViewOpen(false)
                    }
                  }}
                  className={`w-full min-h-[44px] px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                    scope === 'watchlist'
                      ? 'opacity-40 cursor-not-allowed text-zinc-500'
                      : viewOption === 'priority'
                      ? 'text-emerald-400 font-semibold hover:bg-zinc-800/80'
                      : 'text-zinc-300 hover:bg-zinc-800/80'
                  }`}
                  title={
                    scope === 'watchlist'
                      ? 'The priority feed covers your holdings. View watchlist filings by company.'
                      : undefined
                  }
                >
                  <div className="flex flex-col">
                    <span>Priority feed</span>
                    {scope === 'watchlist' && (
                      <span className="text-[10px] text-zinc-500">Holdings only</span>
                    )}
                  </div>
                  {viewOption === 'priority' && scope !== 'watchlist' && (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>

                {/* By company: important first */}
                <button
                  type="button"
                  onClick={() => {
                    onViewChange('company_important')
                    setViewOpen(false)
                  }}
                  className={`w-full min-h-[44px] px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-zinc-800/80 transition-colors ${
                    viewOption === 'company_important'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-zinc-300'
                  }`}
                >
                  <span>By company: important first</span>
                  {viewOption === 'company_important' && (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>

                {/* By company: A-Z */}
                <button
                  type="button"
                  onClick={() => {
                    onViewChange('company_az')
                    setViewOpen(false)
                  }}
                  className={`w-full min-h-[44px] px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-zinc-800/80 transition-colors ${
                    viewOption === 'company_az'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-zinc-300'
                  }`}
                >
                  <span>By company: A-Z</span>
                  {viewOption === 'company_az' && (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right side icons: [search icon] [(i) icon] */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border transition-all touch-manipulation ${
              searchOpen || searchQuery
                ? 'bg-brand-tint text-brand-text border-brand-text'
                : 'bg-zinc-900 text-zinc-400 border-zinc-500 hover:text-zinc-200'
            }`}
            aria-label="Toggle search"
            title="Search filings"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenHelp()}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors touch-manipulation"
            aria-label="Help: How to read this"
            title="How to read Today"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 3 (Expandable Search Row) */}
      <div className={searchOpen || searchQuery ? "pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150" : "sr-only"}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            inputMode="search"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search stock, sector or headline..."
            className="w-full bg-zinc-900 border border-zinc-500 rounded-xl pl-9 pr-10 py-2.5 min-h-[44px] text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-1 p-2 text-zinc-400 hover:text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visually hidden helper buttons for automated tests and accessibility */}
      <div className="sr-only" aria-hidden="true">
        <button type="button" tabIndex={-1} onClick={() => onWindowChange('24h')}>24h</button>
        <button type="button" tabIndex={-1} onClick={() => onWindowChange('3d')}>3d</button>
        <button type="button" tabIndex={-1} onClick={() => onWindowChange('7d')}>7d</button>
        <button type="button" tabIndex={-1} onClick={() => onWindowChange('30d')}>30d</button>
        <button type="button" tabIndex={-1} onClick={() => onViewChange('company_important')}>By company</button>
        <button type="button" tabIndex={-1} onClick={() => onViewChange('priority')}>Ranked</button>
        <div role="group" aria-label="Sort companies">
          <button type="button" tabIndex={-1} onClick={() => onViewChange('company_important')}>Important first</button>
          <button type="button" tabIndex={-1} onClick={() => onViewChange('company_az')}>A–Z</button>
        </div>
      </div>
    </div>
  )
}
