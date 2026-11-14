import React, { useEffect, useRef } from 'react'
import { X, HelpCircle } from 'lucide-react'

interface HowToReadSheetProps {
  isOpen: boolean
  onClose: () => void
  initialSection?: 'needs_you' | 'period' | 'view' | null
}

export const HowToReadSheet: React.FC<HowToReadSheetProps> = ({
  isOpen,
  onClose,
  initialSection,
}) => {
  const needsYouRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (isOpen && initialSection === 'needs_you' && needsYouRef.current) {
      setTimeout(() => {
        needsYouRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [isOpen, initialSection])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Sheet Modal */}
      <div
        role="dialog"
        aria-labelledby="help-sheet-title"
        className="relative z-10 w-full max-w-[430px] max-h-[85vh] bg-zinc-950 border-t border-zinc-800 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250"
      >
        {/* Drag handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-zinc-800 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 py-2 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <h2 id="help-sheet-title" className="text-sm font-bold text-zinc-100">
              How to read Today
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors touch-manipulation"
            aria-label="Close help"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 text-[11px] text-zinc-400 bg-zinc-900/40 border-b border-zinc-800/60 leading-relaxed">
          Choose a period, then decide whether to scan events or companies.
        </div>

        {/* Scrollable Definition List */}
        <div className="px-4 py-3 overflow-y-auto space-y-3 text-xs">
          {/* Period */}
          <div className="space-y-0.5">
            <dt className="font-semibold text-zinc-200 font-mono text-[11px] uppercase tracking-wider">
              Period
            </dt>
            <dd className="text-zinc-400 text-xs leading-relaxed">
              BSE filing time in IST: past 24 hours, 3, 7 or 30 days maximum.
            </dd>
          </div>

          {/* View */}
          <div className="space-y-0.5">
            <dt className="font-semibold text-zinc-200 font-mono text-[11px] uppercase tracking-wider">
              View
            </dt>
            <dd className="text-zinc-400 text-xs leading-relaxed">
              Choose how to group or sort filings from the same period.
            </dd>
          </div>

          {/* Sub-views */}
          <div className="space-y-2 pl-2.5 border-l-2 border-zinc-800/80">
            <div className="space-y-0.5">
              <dt className="font-semibold text-zinc-300 text-[11px]">
                Priority feed
              </dt>
              <dd className="text-zinc-400 text-xs leading-relaxed">
                Ranks filings across your 17 holdings by what needs attention first.
              </dd>
            </div>

            <div className="space-y-0.5">
              <dt className="font-semibold text-zinc-300 text-[11px]">
                By company: important first
              </dt>
              <dd className="text-zinc-400 text-xs leading-relaxed">
                Shows each stock’s material filing count; its highest-ranked filing determines its place.
              </dd>
            </div>

            <div className="space-y-0.5">
              <dt className="font-semibold text-zinc-300 text-[11px]">
                By company: A–Z
              </dt>
              <dd className="text-zinc-400 text-xs leading-relaxed">
                Lists companies alphabetically by stock symbol.
              </dd>
            </div>
          </div>

          {/* Buckets */}
          <section
            ref={needsYouRef}
            className={`space-y-0.5 rounded-lg p-2 transition-colors ${
              initialSection === 'needs_you'
                ? 'bg-emerald-950/30 border border-emerald-800/60'
                : ''
            }`}
          >
            <dt className="font-semibold text-emerald-400 font-mono text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Needs you</span>
              {initialSection === 'needs_you' && (
                <span className="text-[10px] text-emerald-400 font-normal">Highlighted</span>
              )}
            </dt>
            <dd className="text-zinc-300 text-xs leading-relaxed">
              Up to five top-ranked events; repeat filings about the same event share one card.
            </dd>
          </section>

          <div className="space-y-0.5">
            <dt className="font-semibold text-zinc-200 font-mono text-[11px] uppercase tracking-wider">
              Also material
            </dt>
            <dd className="text-zinc-400 text-xs leading-relaxed">
              Other high- or medium-priority filings outside the top group.
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="font-semibold text-zinc-200 font-mono text-[11px] uppercase tracking-wider">
              Routine
            </dt>
            <dd className="text-zinc-400 text-xs leading-relaxed">
              Remaining filings, folded away until you open them.
            </dd>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-900/50 border-t border-zinc-800/80">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors touch-manipulation border border-zinc-700 dark:border-[#7C8AA8]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
