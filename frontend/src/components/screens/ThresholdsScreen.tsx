import React, { useState } from 'react'
import { useSettings, getCategoryTriState } from '@/lib/settings'
import { Category } from '@/api/types'
import { Sliders, RotateCcw, ChevronDown, Check, BellRing, SunMoon } from 'lucide-react'
import { useTheme } from '@/lib/theme'

interface CategoryConfig {
  id: Category
  label: string
  helper: string
}

const CORE_CATEGORIES: CategoryConfig[] = [
  { id: 'results', label: 'Financial results', helper: 'Quarterly or annual revenue, profit and other results.' },
  { id: 'm_and_a', label: 'M&A', helper: 'Deals to buy, sell or merge businesses.' },
  { id: 'fund_raise', label: 'Fund raise', helper: 'Plans to raise money through shares or debt.' },
  { id: 'management_change', label: 'Management change', helper: 'Executive or board appointments, departures and role changes.' },
  { id: 'litigation', label: 'Litigation', helper: 'Legal disputes, rulings and settlements.' },
  { id: 'insider_trading', label: 'Insider trading', helper: 'Disclosed trades by company insiders.' },
  { id: 'pledging', label: 'Promoter pledging', helper: 'Promoter shares given as collateral or released.' },
  { id: 'credit_rating', label: 'Credit rating', helper: 'Ratings or outlooks on company debt.' },
]

const ROUTINE_CATEGORIES: CategoryConfig[] = [
  { id: 'earnings_call', label: 'Earnings call', helper: 'Call notices, recordings and transcripts about results.' },
  { id: 'investor_meetings', label: 'Investor meetings', helper: 'Meetings with investors or analysts.' },
  { id: 'dividend', label: 'Dividend', helper: 'Dividend proposals, amounts and payment dates.' },
  { id: 'bonus_split', label: 'Bonus or split', helper: 'Bonus shares or changes in share face value.' },
  { id: 'capex', label: 'Capital spending', helper: 'Spending plans for plants, equipment or expansion.' },
  { id: 'press_release', label: 'Press release', helper: 'Company announcements issued to the press.' },
  { id: 'postal_ballot', label: 'Postal ballot', helper: 'Shareholder votes held outside a general meeting.' },
  { id: 'agm_egm', label: 'AGM or EGM', helper: 'Notices and outcomes of shareholder meetings.' },
  { id: 'unclassified', label: 'Unclassified', helper: 'Filings without a recognised category.' },
]

export const ThresholdsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    setCategoryTriState,
    resetSettings,
  } = useSettings()
  const { theme, setTheme } = useTheme()

  // Only one main accordion open at a time (collapsed by default, supports ?section=<name>)
  const [expandedSection, setExpandedSection] = useState<'volume' | 'price' | 'categories' | null>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('section')
      if (p === 'volume' || p === 'price' || p === 'categories') return p
    } catch {}
    return null
  })
  // Subgroup for routine paperwork inside Filing Types (collapsed by default)
  const [routineOpen, setRoutineOpen] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('reset') === 'true'
    } catch {}
    return false
  })
  const [resetNotification, setResetNotification] = useState(false)

  const toggleSection = (section: 'volume' | 'price' | 'categories') => {
    setExpandedSection((prev) => (prev === section ? null : section))
  }

  const volumePresets = [1.5, 2.0, 3.0, 4.0, 5.0]
  const pricePresets = [2.0, 3.0, 5.0, 7.0, 10.0]

  const boostedCount = settings.categories_of_interest.length
  const hiddenCount = settings.muted_categories.length

  const volStr =
    settings.volume_multiple % 1 === 0
      ? settings.volume_multiple.toFixed(0)
      : settings.volume_multiple.toFixed(1)
  const priceStr =
    settings.price_move_pct % 1 === 0
      ? settings.price_move_pct.toFixed(0)
      : settings.price_move_pct.toFixed(1)

  return (
    <div className="space-y-2 pb-24 pt-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-300" />
            Settings
          </h1>
          <p className="text-xs text-zinc-400 mt-1 truncate" title="Alerts, filing types and appearance · Saved on this device">
            Alerts, filing types and appearance · Saved on this device
          </p>
        </div>
        <button
          onClick={() => setShowResetDialog(true)}
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 min-h-[44px] rounded bg-zinc-900 border border-zinc-500 transition-colors touch-manipulation"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{resetNotification ? 'Reset!' : 'Reset'}</span>
        </button>
      </div>

      {/* Top One-Sentence Summary Line (GPT-9 template) */}
      <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed">
        Alerts start at {volStr}× average volume or a {priceStr}% move either way; filing types: {boostedCount} boosted, {hiddenCount} hidden.
      </div>

      {/* Appearance Control (Light | Dark | Auto) */}
      <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <SunMoon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Appearance</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1 truncate" title="Light paper default or black dark mode">
            Light paper default or black dark mode
          </div>
        </div>

        <div
          role="group"
          aria-label="Appearance theme"
          className="inline-flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-500 flex-shrink-0"
        >
          {(['light', 'dark', 'auto'] as const).map((mode) => {
            const isSelected = theme === mode
            const label = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'Auto'
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className={`px-3 py-2 min-h-[44px] min-w-[44px] text-xs rounded-md touch-manipulation transition-colors duration-200 ease-out motion-reduce:transition-none font-semibold ${
                  isSelected
                    ? 'bg-brand-tint text-brand-text font-semibold shadow-sm border border-brand'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Accordion Container */}
      <div className="space-y-2">
        {/* Accordion Row 1: Volume Spike */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-colors duration-200 ease-out motion-reduce:transition-none">
          <button
            type="button"
            onClick={() => toggleSection('volume')}
            className="w-full min-h-[64px] p-3 flex items-center justify-between gap-2 text-left touch-manipulation hover:bg-zinc-800/30 transition-colors"
            aria-expanded={expandedSection === 'volume'}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-200">Volume spike</div>
              <div className="text-xs text-zinc-500 mt-1 truncate">
                Compare today’s volume with its 20-day average.
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-mono font-semibold text-zinc-300">
                {volStr}×
              </span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                  expandedSection === 'volume' ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {expandedSection === 'volume' && (
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-zinc-800/60">
              <div className="text-[11px] text-zinc-400">
                Alert when volume is {volStr}x its {settings.volume_lookback_days}-day average
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2 flex-wrap">
                {volumePresets.map((vp) => {
                  const isSelected = Math.abs(settings.volume_multiple - vp) < 0.05
                  return (
                    <button
                      key={vp}
                      type="button"
                      onClick={() => updateSettings({ volume_multiple: vp })}
                      className={`px-3 py-2 text-xs rounded-md border min-h-[44px] transition-colors duration-200 ease-out motion-reduce:transition-none touch-manipulation ${
                        isSelected
                          ? 'bg-brand-tint text-brand-text border-brand font-semibold shadow-sm'
                          : 'bg-zinc-950/40 text-zinc-400 border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {vp.toFixed(vp % 1 === 0 ? 0 : 1)}×
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
                className="w-full min-h-[44px] accent-zinc-200 cursor-pointer bg-zinc-800 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Accordion Row 2: Price Move */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-colors duration-200 ease-out motion-reduce:transition-none">
          <button
            type="button"
            onClick={() => toggleSection('price')}
            className="w-full min-h-[64px] p-3 flex items-center justify-between gap-2 text-left touch-manipulation hover:bg-zinc-800/30 transition-colors"
            aria-expanded={expandedSection === 'price'}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-200">Price move</div>
              <div className="text-xs text-zinc-500 mt-1 truncate">
                Compare today’s closing price with the previous close.
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-mono font-semibold text-zinc-300">
                ±{priceStr}%
              </span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                  expandedSection === 'price' ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {expandedSection === 'price' && (
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-zinc-800/60">
              <div className="text-[11px] text-zinc-400">
                Alert when daily close moves {priceStr}% or more
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2 flex-wrap">
                {pricePresets.map((pp) => {
                  const isSelected = Math.abs(settings.price_move_pct - pp) < 0.05
                  return (
                    <button
                      key={pp}
                      type="button"
                      onClick={() => updateSettings({ price_move_pct: pp })}
                      className={`px-3 py-2 text-xs rounded-md border min-h-[44px] transition-colors duration-200 ease-out motion-reduce:transition-none touch-manipulation ${
                        isSelected
                          ? 'bg-brand-tint text-brand-text border-brand font-semibold shadow-sm'
                          : 'bg-zinc-950/40 text-zinc-400 border-zinc-500 hover:text-zinc-200'
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
                className="w-full min-h-[44px] accent-zinc-200 cursor-pointer bg-zinc-800 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Accordion Row 3: Filing Types Editor */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-colors duration-200 ease-out motion-reduce:transition-none">
          <button
            type="button"
            onClick={() => toggleSection('categories')}
            className="w-full min-h-[64px] p-3 flex items-center justify-between gap-2 text-left touch-manipulation hover:bg-zinc-800/30 transition-colors"
            aria-expanded={expandedSection === 'categories'}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-200">Filing types</div>
              <div className="text-xs text-zinc-500 mt-1 truncate">
                Choose which filings rank higher or stay in Routine.
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-mono font-semibold text-zinc-300">
                {boostedCount} boosted · {hiddenCount} hidden
              </span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                  expandedSection === 'categories' ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {expandedSection === 'categories' && (
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-zinc-800/60">
              {/* Setting Explanations from GPT-9 */}
              <div className="text-[11px] text-zinc-400 space-y-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-zinc-300 text-[11px] w-12 flex-shrink-0">Boost:</span>
                  <span className="text-zinc-300">Ranks these filings higher and can trigger a material filing alert.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-zinc-400 text-[11px] w-12 flex-shrink-0">Normal:</span>
                  <span className="text-zinc-400">Keeps the usual ranking without triggering an alert for this filing type alone.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-zinc-300 text-[11px] w-12 flex-shrink-0">Hide:</span>
                  <span className="text-zinc-400">Keeps these filings in Routine and turns off their filing alerts.</span>
                </div>
              </div>

              {/* Group 1: Core Categories (Always open) */}
              <div className="space-y-2">
                <div className="text-[11px] uppercase font-semibold tracking-wider text-zinc-400 px-1">
                  Core Corporate Events ({CORE_CATEGORIES.length})
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 divide-y divide-zinc-800/60 overflow-hidden">
                  {CORE_CATEGORIES.map((cat) => {
                    const state = getCategoryTriState(cat.id, settings)
                    return (
                      <div key={cat.id} className="px-3 py-2 flex min-h-[64px] items-center justify-between gap-2">
                        <div className="min-w-0 pr-2">
                          <div className="text-sm font-semibold text-zinc-200 truncate">{cat.label}</div>
                          <div className="text-[11px] text-zinc-500 truncate">{cat.helper}</div>
                        </div>

                        {/* Tri-state segmented control: Boost | Normal | Hide */}
                        <div
                          role="group"
                          aria-label={`${cat.label} priority`}
                          className="inline-flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-500 flex-shrink-0"
                        >
                          <button
                            type="button"
                            title="Ranks these filings higher and can trigger a material filing alert."
                            onClick={() => setCategoryTriState(cat.id, 'boost')}
                            className={`px-2 py-1 text-[11px] rounded min-h-[44px] min-w-[44px] transition-colors duration-200 ease-out motion-reduce:transition-none touch-manipulation ${
                              state === 'boost'
                                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Boost
                          </button>
                          <button
                            type="button"
                            title="Keeps the usual ranking without triggering an alert for this filing type alone."
                            onClick={() => setCategoryTriState(cat.id, 'normal')}
                            className={`px-2 py-1 text-[11px] rounded min-h-[44px] min-w-[44px] transition-colors duration-200 ease-out motion-reduce:transition-none touch-manipulation ${
                              state === 'normal'
                                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            title="Keeps these filings in Routine and turns off their filing alerts."
                            onClick={() => setCategoryTriState(cat.id, 'hide')}
                            className={`px-2 py-1 text-[11px] rounded min-h-[44px] min-w-[44px] transition-colors duration-200 ease-out motion-reduce:transition-none touch-manipulation ${
                              state === 'hide'
                                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold shadow-sm'
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
                  className="w-full flex items-center justify-between text-left px-1 py-1 text-[11px] uppercase font-semibold tracking-wider text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  <span>Routine Paperwork ({ROUTINE_CATEGORIES.length})</span>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-normal lowercase">
                    <span>{routineOpen ? 'hide' : 'show'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                        routineOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {routineOpen && (
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 divide-y divide-zinc-800/60 overflow-hidden">
                    {ROUTINE_CATEGORIES.map((cat) => {
                      const state = getCategoryTriState(cat.id, settings)
                      return (
                        <div key={cat.id} className="px-3 py-2 flex min-h-[64px] items-center justify-between gap-2">
                          <div className="min-w-0 pr-2">
                            <div className="text-sm font-semibold text-zinc-200 truncate">{cat.label}</div>
                            <div className="text-[11px] text-zinc-500 truncate">{cat.helper}</div>
                          </div>

                          {/* Tri-state segmented control */}
                          <div
                            role="group"
                            aria-label={`${cat.label} priority`}
                            className="inline-flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-500 flex-shrink-0"
                          >
                            <button
                              type="button"
                              title="Ranks these filings higher and can trigger a material filing alert."
                              onClick={() => setCategoryTriState(cat.id, 'boost')}
                              className={`px-2 py-1 text-[11px] rounded min-h-[44px] min-w-[44px] transition-colors duration-200 ease-out motion-reduce:transition-none touch-manipulation ${
                                state === 'boost'
                                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold shadow-sm'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Boost
                            </button>
                            <button
                              type="button"
                              title="Keeps the usual ranking without triggering an alert for this filing type alone."
                              onClick={() => setCategoryTriState(cat.id, 'normal')}
                              className={`px-2 py-1 text-[11px] rounded min-h-[44px] min-w-[44px] transition-colors duration-200 ease-out motion-reduce:transition-none touch-manipulation ${
                                state === 'normal'
                                  ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold shadow-sm'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              Normal
                            </button>
                            <button
                              type="button"
                              title="Keeps these filings in Routine and turns off their filing alerts."
                              onClick={() => setCategoryTriState(cat.id, 'hide')}
                              className={`px-2 py-1 text-[11px] rounded min-h-[44px] min-w-[44px] transition-colors duration-200 ease-out motion-reduce:transition-none touch-manipulation ${
                                state === 'hide'
                                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold shadow-sm'
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
      <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 pt-2">
        <BellRing className="w-3.5 h-3.5 text-zinc-400" />
        <span>Settings take effect immediately for digest generation and offline alerts</span>
      </div>

      {/* Reset confirmation */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setShowResetDialog(true)}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline min-h-[44px] touch-manipulation"
        >
          Reset to defaults
        </button>
      </div>

      {/* Reset Confirmation Dialog from GPT-9 */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-labelledby="reset-dialog-title"
            aria-describedby="reset-dialog-desc"
            className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-3 shadow-2xl space-y-2"
          >
            <div className="space-y-2">
              <h3 id="reset-dialog-title" className="text-sm font-semibold text-zinc-100">
                Reset alert settings?
              </h3>
              <p id="reset-dialog-desc" className="text-xs text-zinc-400 leading-relaxed">
                Restore the 2× volume and 5% price thresholds, boost the six default filing types and hide Unclassified. This replaces your choices.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowResetDialog(false)}
                className="px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors min-h-[44px] touch-manipulation font-semibold"
              >
                Keep my settings
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSettings()
                  setShowResetDialog(false)
                  setResetNotification(true)
                  setTimeout(() => setResetNotification(false), 2000)
                }}
                className="px-3 py-2 text-xs rounded-xl bg-brand hover:bg-brand-hover text-white transition-colors min-h-[44px] touch-manipulation font-semibold shadow-sm"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
