import { Briefcase, ChevronDown, GraduationCap, Lightbulb, Users } from 'lucide-react'
import { useId, useState } from 'react'
import type { PersonMatch } from '@/api/types'
import { useOpenPerson } from './PersonProvider'

const links = {
  worked_at_company: { Icon: Briefcase, label: 'Worked there' },
  overlapped_with_person: { Icon: Users, label: 'Overlapped' },
  same_school: { Icon: GraduationCap, label: 'Same school' },
  sector_expert: { Icon: Lightbulb, label: 'Expert' },
}

export function Strength({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`strength ${value} of 5`} className="inline-flex gap-1 shrink-0">
      {[1, 2, 3, 4, 5].map(dot => (
        <span key={dot} className={`h-1.5 w-1.5 rounded-full ${dot <= value ? 'bg-brand-text' : 'border border-zinc-500'}`} />
      ))}
    </span>
  )
}

export function PersonMatchRow({ match, onOpenPerson }: {
  match: PersonMatch
  onOpenPerson?: (id: string) => void
}) {
  const openPerson = useOpenPerson()
  const [expanded, setExpanded] = useState(false)
  const evidenceId = useId()
  const { Icon, label } = links[match.link]
  return (
    <div className="py-3 text-xs">
      <div className="flex items-start gap-2.5">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-text font-semibold">
          {match.name.split(' ').map(word => word[0]).slice(0, 2).join('')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <button type="button" onClick={() => (onOpenPerson ?? openPerson)(match.person_id)}
              className="min-h-[44px] text-left font-semibold text-stock rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
              {match.name}
            </button>
            <Strength value={match.strength} />
          </div>
          <p className="text-zinc-400 leading-relaxed">{match.headline}</p>
        </div>
      </div>
      <p className="mt-2 text-zinc-200 leading-relaxed">{match.why}</p>
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-[11px]">
        <span className="inline-flex items-center gap-1 text-zinc-400"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{label}</span>
        <button type="button" aria-expanded={expanded} aria-controls={evidenceId} onClick={() => setExpanded(!expanded)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded text-brand-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          Evidence <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded && <ul id={evidenceId} className="space-y-1 border-l border-zinc-700 pl-2 font-mono text-[11px] text-zinc-400 break-words">
        {match.evidence.length ? match.evidence.map((fact, i) => <li key={i}>{fact}</li>) : <li>No supporting facts supplied.</li>}
      </ul>}
    </div>
  )
}
