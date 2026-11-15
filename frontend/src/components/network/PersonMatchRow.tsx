import { IdentityMark } from '@/components/ui/Desk'
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
        <span key={dot} className={`h-1.5 w-1.5 rounded-full ${dot <= value ? 'bg-zinc-300' : 'border border-zinc-500'}`} />
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
    <div className="desk-person-row text-sm">
      <div className="flex min-h-[44px] items-center gap-2">
        <IdentityMark name={match.name} />
        <button type="button" onClick={() => (onOpenPerson ?? openPerson)(match.person_id)}
          className="min-h-[44px] min-w-0 flex-1 truncate text-left font-semibold text-zinc-100 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          {match.name}
        </button>
        <Strength value={match.strength} />
        <button type="button" aria-expanded={expanded} aria-controls={evidenceId} onClick={() => setExpanded(!expanded)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded text-[11px] text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          Evidence <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <p title={match.why} className="truncate leading-5 text-xs text-zinc-400">{match.why}</p>
      {expanded && <div id={evidenceId} className="selectable desk-inset my-2 space-y-2 text-xs text-zinc-400">
        <p>{match.headline}</p>
        <span className="inline-flex items-center gap-1 text-[11px]"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{label}</span>
        <p className="leading-relaxed">{match.why}</p>
        <ul className="space-y-1 border-l border-zinc-700 pl-2 font-mono text-[11px] break-words">
          {match.evidence.length ? match.evidence.map((fact, i) => <li key={i}>{fact}</li>) : <li>No supporting facts supplied.</li>}
        </ul>
      </div>}
    </div>
  )
}
