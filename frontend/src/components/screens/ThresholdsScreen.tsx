import React from 'react'
import { useSettings } from '@/lib/settings'
import { ALL_CATEGORIES } from '@/api/types'
import { Sliders, RotateCcw, Check, BellRing } from 'lucide-react'

export const ThresholdsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    toggleCategoryInterest,
    toggleCategoryMuted,
    resetSettings,
  } = useSettings()

  const volumePresets = [1.5, 2.0, 3.0, 4.0, 5.0]
  const pricePresets = [2.0, 3.0, 5.0, 7.0, 10.0]

  return (
    <div className="space-y-6 pb-24 pt-1">
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
          onClick={resetSettings}
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Threshold 1: Volume Multiple */}
      <section className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-zinc-200">
              Volume Spike Multiple
            </div>
            <div className="text-[11px] text-zinc-400">
              Trigger when today's volume exceeds {settings.volume_lookback_days}-day avg
            </div>
          </div>
          <div className="text-base font-mono font-bold text-amber-400">
            {settings.volume_multiple.toFixed(1)}×
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-1.5 flex-wrap">
          {volumePresets.map((vp) => {
            const isSelected = Math.abs(settings.volume_multiple - vp) < 0.05
            return (
              <button
                key={vp}
                onClick={() => updateSettings({ volume_multiple: vp })}
                className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
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

        {/* Precision Slider */}
        <input
          type="range"
          min="1.0"
          max="8.0"
          step="0.1"
          value={settings.volume_multiple}
          onChange={(e) => updateSettings({ volume_multiple: parseFloat(e.target.value) })}
          className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
        />
      </section>

      {/* Threshold 2: Price Move Percentage */}
      <section className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-zinc-200">
              Price Move Threshold
            </div>
            <div className="text-[11px] text-zinc-400">
              Trigger when 1-day price swing meets or exceeds
            </div>
          </div>
          <div className="text-base font-mono font-bold text-emerald-400">
            ±{settings.price_move_pct.toFixed(1)}%
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-1.5 flex-wrap">
          {pricePresets.map((pp) => {
            const isSelected = Math.abs(settings.price_move_pct - pp) < 0.05
            return (
              <button
                key={pp}
                onClick={() => updateSettings({ price_move_pct: pp })}
                className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
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

        {/* Precision Slider */}
        <input
          type="range"
          min="1.0"
          max="15.0"
          step="0.5"
          value={settings.price_move_pct}
          onChange={(e) => updateSettings({ price_move_pct: parseFloat(e.target.value) })}
          className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
        />
      </section>

      {/* Categories of Interest */}
      <section className="space-y-2.5">
        <div>
          <div className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Categories of Interest ({settings.categories_of_interest.length})
          </div>
          <p className="text-[11px] text-zinc-400">
            Filings in these categories are elevated to "Needs you" or "Also material"
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const isInterested = settings.categories_of_interest.includes(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategoryInterest(cat.id)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 ${
                  isInterested
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-medium'
                    : 'bg-zinc-950/40 text-zinc-500 border-zinc-800/80 hover:text-zinc-300'
                }`}
              >
                {isInterested && <Check className="w-3 h-3 text-emerald-400" />}
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Muted Categories */}
      <section className="space-y-2.5">
        <div>
          <div className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Muted Categories ({settings.muted_categories.length})
          </div>
          <p className="text-[11px] text-zinc-400">
            Filings in these categories always collapse into Routine
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const isMuted = settings.muted_categories.includes(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategoryMuted(cat.id)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                  isMuted
                    ? 'bg-zinc-800 text-amber-300 border-amber-900/60 font-medium'
                    : 'bg-zinc-950/40 text-zinc-500 border-zinc-800/80 hover:text-zinc-300'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Auto-save confirmation footnote */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 pt-2">
        <BellRing className="w-3 h-3 text-zinc-400" />
        <span>Settings take effect immediately for digest generation and offline alerts</span>
      </div>
    </div>
  )
}
