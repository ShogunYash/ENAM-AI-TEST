import React, { useState } from 'react'
import { useSettings, getCategoryTriState } from '@/lib/settings'
import { Category } from '@/api/types'
import { Sliders, RotateCcw, ChevronDown, Check, BellRing } from 'lucide-react'

interface CategoryConfig {
  id: Category
  label: string
  helper: string
}

const CORE_CATEGORIES: CategoryConfig[] = [
  { id: 'results', label: 'Financial Results', helper: 'Quarterly numbers, revenue to profit' },
  { id: 'm_and_a', label: 'M&A / Acquisitions', helper: 'Acquisitions, mergers, takeovers' },
  { id: 'fund_raise', label: 'Fund Raise', helper: 'QIP, rights, preferential issues' },
  { id: 'management_change', label: 'Management Change', helper: 'Key executives and board changes' },
  { id: 'litigation', label: 'Litigation / Legal', helper: 'Court disputes, regulatory penalties' },
  { id: 'insider_trading', label: 'Insider Trading', helper: 'Promoter and director trades' },
  { id: 'pledging', label: 'Promoter Pledging', helper: 'Shares pledged or released' },
  { id: 'credit_rating', label: 'Credit Rating', helper: 'Rating upgrades and downgrades' },
]

const ROUTINE_CATEGORIES: CategoryConfig[] = [
  { id: 'earnings_call', label: 'Earnings Call', helper: 'Call transcripts and audio records' },
  { id: 'investor_meetings', label: 'Investor Meetings', helper: 'Analyst meet schedules' },
  { id: 'dividend', label: 'Dividend', helper: 'Interim and final payouts' },
  { id: 'bonus_split', label: 'Bonus / Split', helper: 'Bonus shares, face value splits' },
  { id: 'capex', label: 'Capex', helper: 'Capacity expansion updates' },
  { id: 'press_release', label: 'Press Release', helper: 'Media statements and business updates' },
  { id: 'postal_ballot', label: 'Postal Ballot', helper: 'Shareholder voting notices' },
  { id: 'agm_egm', label: 'AGM / EGM', helper: 'Annual and extraordinary meetings' },
  { id: 'unclassified', label: 'Unclassified', helper: 'General exchange disclosures' },
]

export const ThresholdsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    setCategoryTriState,
    resetSettings,
  } = useSettings()

  // Only one main accordion open at a time (collapsed by default)
  const [expandedSection, setExpandedSection] = useState<'volume' | 'price' | 'categories' | null>(null)
  // Subgroup for routine paperwork inside Filing Types (collapsed by default)
  const [routineOpen, setRoutineOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  const toggleSection = (section: 'volume' | 'price' | 'categories') => {
    setExpandedSection((prev) => (prev === section ? null : section))
  }

  const volumePresets = [1.5, 2.0, 3.0, 4.0, 5.0]
  const pricePresets = [2.0, 3.0, 5.0, 7.0, 10.0]

  const boostedCount = settings.categories_of_interest.length
  const hiddenCount = settings.muted_categories.length

  const handleReset = () => {
    resetSettings()
    setResetConfirm(true)
    setTimeout(() => setResetConfirm(false), 2000)
  }

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-300" />
            Alerts & Thresholds
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configures Push digest triggers · Saved locally
          </p>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 transition-colors touch-manipulation"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{resetConfirm ? 'Reset!' : 'Reset'}</span>
        </button>
      </div>

      {/* Top One-Sentence Summary Line */}
      <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed font-mono">
        Alerting on volume &gt;= {settings.volume_multiple.toFixed(1)}x, price &plusmn;{settings.price_move_pct.toFixed(1)}%, {boostedCount} boosted filing types
      </div>

      {/* Accordion Container */}
      <div className="space-y-2.5">
        {/* Accordion Row 1: Volume Spike */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('volume')}
            className="w-full p-3.5 flex items-center justify-between text-left touch-manipulation hover:bg-zinc-800/30 transition-colors"
            aria-expanded={expandedSection === 'volume'}
          >
            <div>
              <div className="text-xs font-semibold text-zinc-200">Volume spike</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Spike vs {settings.volume_lookback_days}-day average volume
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-amber-400">
                {settings.volume_multiple.toFixed(1)}×
              </span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                  expandedSection === 'volume' ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {expandedSection === 'volume' && (
            <div className="px-3.5 pb-4 pt-1 space-y-3 border-t border-zinc-800/60 animate-in fade-in duration-150">
              <div className="text-[11px] text-zinc-400">
                Alert when volume is {settings.volume_multiple.toFixed(1)}x its {settings.volume_lookback_days}-day average
              </div>

              {/* Quick Presets */}
              <div className="flex gap-1.5 flex-wrap">
                {volumePresets.map((vp) => {
                  const isSelected = Math.abs(settings.volume_multiple - vp) < 0.05
                  return (
                    <button
                      key={vp}
                      type="button"
                      onClick={() => updateSettings({ volume_multiple: vp })}
                      className={`px-3 py-1.5 text-xs font-mono rounded-md border min-h-[36px] transition-all touch-manipulation ${
                        isSelected
                          ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold shadow-sm'
                          : 'bg-zinc-950/40 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {vp.toFixed(1)}×
                    </button>
                  )
                })}
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.1"
                value={settings.volume_multiple}
                onChange={(e) => updateSettings({ volume_multiple: parseFloat(e.target.value) })}
                className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Accordion Row 2: Price Move */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('price')}
            className="w-full p-3.5 flex items-center justify-between text-left touch-manipulation hover:bg-zinc-800/30 transition-colors"
            aria-expanded={expandedSection === 'price'}
          >
            <div>
              <div className="text-xs font-semibold text-zinc-200">Price move</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Daily close move trigger
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-emerald-400">
                ±{settings.price_move_pct.toFixed(0)}%
              </span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                  expandedSection === 'price' ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {expandedSection === 'price' && (
            <div className="px-3.5 pb-4 pt-1 space-y-3 border-t border-zinc-800/60 animate-in fade-in duration-150">
              <div className="text-[11px] text-zinc-400">
                Alert when daily close moves {settings.price_move_pct.toFixed(1)}% or more
              </div>

              {/* Quick Presets */}
              <div className="flex gap-1.5 flex-wrap">
                {pricePresets.map((pp) => {
                  const isSelected = Math.abs(settings.price_move_pct - pp) < 0.05
                  return (
                    <button
                      key={pp}
                      type="button"
                      onClick={() => updateSettings({ price_move_pct: pp })}
                      className={`px-3 py-1.5 text-xs font-mono rounded-md border min-h-[36px] transition-all touch-manipulation ${
                        isSelected
                          ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold shadow-sm'
                          : 'bg-zinc-950/40 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      ±{pp.toFixed(0)}%
                    </button>
                  )
                })}
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1.0"
                max="15.0"
                step="0.5"
                value={settings.price_move_pct}
                onChange={(e) => updateSettings({ price_move_pct: parseFloat(e.target.value) })}
                className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Accordion Row 3: Filing Types Editor */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('categories')}
            className="w-full p-3.5 flex items-center justify-between text-left touch-manipulation hover:bg-zinc-800/30 transition-colors"
            aria-expanded={expandedSection === 'categories'}
          >
            <div>
              <div className="text-xs font-semibold text-zinc-200">Filing types</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Elevate key events or collapse paperwork
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-zinc-300">
                {boostedCount} boosted · {hiddenCount} hidden
              </span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                  expandedSection === 'categories' ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {expandedSection === 'categories' && (
            <div className="px-3 pb-3 pt-1 space-y-4 border-t border-zinc-800/60 animate-in fade-in duration-150">
              <p className="text-[11px] text-zinc-400 leading-relaxed px-1">
                Boosted categories rank higher and can trigger material alerts. Hidden categories always collapse into Routine.
              </p>

              {/* Group 1: Core Categories (Always open) */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-1">
                  Core Corporate Events ({CORE_CATEGORIES.length})
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 divide-y divide-zinc-800/60 overflow-hidden">
                  {CORE_CATEGORIES.map((cat) => {
                    const state = getCategoryTriState(cat.id, settings)
                    return (
                      <div key={cat.id} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium text-zinc-200 truncate">{cat.label}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{cat.helper}</div>
                        </div>

                        {/* Tri-state segmented control: Boost | Normal | Hide */}
                        <div
                          role="group"
                          aria-label={`${cat.label} priority`}
                          className="inline-flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0"
                        >
                          <button
                            type="button"
                            onClick={() => setCategoryTriState(cat.id, 'boost')}
                            className={`px-2 py-1 text-[11px] font-mono rounded min-h-[32px] transition-all touch-manipulation ${
                              state === 'boost'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 font-bold shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Boost
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryTriState(cat.id, 'normal')}
                            className={`px-2 py-1 text-[11px] font-mono rounded min-h-[32px] transition-all touch-manipulation ${
                              state === 'normal'
                                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryTriState(cat.id, 'hide')}
                            className={`px-2 py-1 text-[11px] font-mono rounded min-h-[32px] transition-all touch-manipulation ${
                              state === 'hide'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80 font-bold shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Hide
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Group 2: Routine Paperwork (Collapsible, closed by default) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setRoutineOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-left px-1 py-1 text-[10px] uppercase font-bold tracking-wider text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  <span>Routine Paperwork ({ROUTINE_CATEGORIES.length})</span>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-normal lowercase">
                    <span>{routineOpen ? 'hide' : 'show'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        routineOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {routineOpen && (
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 divide-y divide-zinc-800/60 overflow-hidden animate-in fade-in duration-150">
                    {ROUTINE_CATEGORIES.map((cat) => {
                      const state = getCategoryTriState(cat.id, settings)
                      return (
                        <div key={cat.id} className="p-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-medium text-zinc-200 truncate">{cat.label}</div>
                            <div className="text-[10px] text-zinc-500 truncate">{cat.helper}</div>
                          </div>

                          {/* Tri-state segmented control */}
                          <div
                            role="group"
                            aria-label={`${cat.label} priority`}
                            className="inline-flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0"
                          >
                            <button
                              type="button"
                              onClick={() => setCategoryTriState(cat.id, 'boost')}
                              className={`px-2 py-1 text-[11px] font-mono rounded min-h-[32px] transition-all touch-manipulation ${
                                state === 'boost'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 font-bold shadow-sm'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Boost
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryTriState(cat.id, 'normal')}
                              className={`px-2 py-1 text-[11px] font-mono rounded min-h-[32px] transition-all touch-manipulation ${
                                state === 'normal'
                                  ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold shadow-sm'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Normal
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryTriState(cat.id, 'hide')}
                              className={`px-2 py-1 text-[11px] font-mono rounded min-h-[32px] transition-all touch-manipulation ${
                                state === 'hide'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80 font-bold shadow-sm'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Hide
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auto-save confirmation footnote */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 pt-2">
        <BellRing className="w-3.5 h-3.5 text-zinc-400" />
        <span>Settings take effect immediately for digest generation and offline alerts</span>
      </div>

      {/* Reset confirmation */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline min-h-[44px] touch-manipulation"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
