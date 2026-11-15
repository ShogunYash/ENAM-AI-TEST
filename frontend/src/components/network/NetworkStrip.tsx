import { useId, useState } from 'react'
import { ChevronDown, Info, Users } from 'lucide-react'
import { SYNTHETIC_NOTE, useNetworkInsights } from '@/api/network'
import { PersonMatchRow } from './PersonMatchRow'

export function NetworkStrip({ filingId }: { filingId: string }) {
  const { data } = useNetworkInsights()
  const insight = data?.get(filingId)
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()
  if (!insight) return null
  return (
    <section className="mt-3 border-t border-zinc-700 text-xs">
      <button type="button" aria-label={`In your network: ${insight.headline}`} title={insight.headline} aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(!expanded)}
        className="flex min-h-[44px] w-full items-center gap-2 rounded py-2 text-left text-brand-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="shrink-0 text-[11px] font-semibold">In your network</span>
        <span className="min-w-0 flex-1 truncate">{insight.headline}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {expanded && <div id={contentId}>
        <p className="text-[11px] text-zinc-400">{SYNTHETIC_NOTE}</p>
        {insight.kind === 'material_event' && <p className="mt-2 font-semibold text-zinc-100">Best person to call</p>}
        <div className="divide-y divide-zinc-700">{insight.matches.slice(0, 3).map(match => <PersonMatchRow key={match.person_id} match={match} />)}</div>
        {insight.note && <p className="mb-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-400"><Info className="h-4 w-4 shrink-0" />{insight.note}</p>}
      </div>}
    </section>
  )
}
