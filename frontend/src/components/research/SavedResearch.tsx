import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { IdentityMark } from '@/components/ui/Desk'
import { formatExactIst } from '@/lib/formatters'
import { removeSavedResearch, type SavedResearch as SavedReport } from '@/lib/researchStorage'
import { verdictSummary } from '@/lib/researchSummary'

export function SavedResearch({ reports, onOpen }: { reports: SavedReport[]; onOpen: (symbol: string) => void }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  if (!reports.length) return null
  return <section className="desk-panel" aria-label="Saved research">
    <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}
      className="desk-panel-header w-full min-h-[44px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
      <span className="desk-panel-label"><span className="desk-panel-code" aria-hidden="true">DEV</span>Saved on this device</span>
      <span className="desk-count">{reports.length}</span>
      <ChevronDown aria-hidden="true" className={`ml-auto h-4 w-4 text-zinc-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <>
    <div id={bodyId} className="divide-y divide-zinc-700">
      {(showAll ? reports : reports.slice(0, 3)).map(({ savedAt, data }) => <div key={data.symbol} className="px-3 py-2">
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => onOpen(data.symbol)} aria-label={`Open saved ${data.symbol}`}
            className="min-h-[44px] min-w-0 flex-1 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            <span className="flex flex-wrap items-center gap-2"><IdentityMark name={data.symbol} kind="company" symbol={data.symbol} /><span className="font-mono text-sm font-semibold text-stock">{data.symbol}</span><span className="text-xs text-stock">{data.name}</span></span>
            <span className="mt-1 block text-[11px] text-zinc-400">{verdictSummary(data.pvd) || 'No guidance comparisons'}</span>
          </button>
          <button type="button" onClick={() => setConfirm(data.symbol)} aria-label={`Remove saved ${data.symbol}`}
            className="min-h-[44px] rounded px-2 text-xs text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">Remove</button>
        </div>
        <p className="font-mono text-[11px] text-zinc-400">Saved {formatExactIst(savedAt)}</p>
        {confirm === data.symbol && <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-zinc-700 pt-2 text-xs text-zinc-300">
          <p className="w-full">Remove {data.symbol} from this device?</p>
          <button type="button" onClick={() => { removeSavedResearch(data.symbol); setConfirm(null) }} aria-label={`Confirm remove ${data.symbol}`}
            className="min-h-[44px] rounded border border-zinc-500 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">Remove</button>
          <button type="button" onClick={() => setConfirm(null)} className="min-h-[44px] rounded px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">Keep</button>
        </div>}
      </div>)}
    </div>
    {reports.length > 3 && <button type="button" onClick={() => setShowAll(!showAll)} className="min-h-[44px] w-full border-t border-zinc-500 px-3 text-left text-xs text-zinc-300">{showAll ? 'Show less' : `Show all (${reports.length})`}</button>}
    </>}
  </section>
}
