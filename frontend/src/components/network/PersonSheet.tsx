import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { SYNTHETIC_NOTE, useNetworkPeople } from '@/api/network'
import { Strength } from './PersonMatchRow'

export function PersonSheet({ personId, onClose }: { personId: string; onClose: () => void }) {
  const { data: people, isLoading, isError } = useNetworkPeople()
  const person = people?.find(row => row.id === personId)
  const sheet = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheet.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const elements = sheet.current?.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex="0"]')
      if (!elements?.length) { event.preventDefault(); return }
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheet.current)) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      previousFocus?.focus()
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-overlay" onClick={onClose}>
      <div ref={sheet} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="network-person-title"
        onClick={event => event.stopPropagation()}
        className="relative w-full max-w-[430px] max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-950 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] focus:outline-none">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] text-zinc-400">{SYNTHETIC_NOTE}</p>
            <h2 id="network-person-title" className="mt-1 text-base font-semibold text-zinc-100">{person?.name ?? 'Contact details'}</h2>
          </div>
          <button type="button" aria-label="Close person" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><X className="h-5 w-5" /></button>
        </div>
        {isLoading && <p role="status" className="py-4 text-xs text-zinc-400 motion-safe:animate-pulse">Loading contact…</p>}
        {(isError || (!isLoading && !person)) && <p className="py-4 text-xs text-zinc-400">Contact details are unavailable.</p>}
        {person && <div className="space-y-2 pt-2 text-xs text-zinc-300">
          <p className="leading-relaxed">{person.headline}{person.city && ` · ${person.city}`}</p>
          <section>
            <h3 className="mb-2 font-semibold text-zinc-100">How you know them</h3>
            <Strength value={person.relationship.strength} />
            <p className="mt-2 leading-relaxed">{person.relationship.how_met}</p>
            <p className="mt-1 text-zinc-400">Last contact {person.relationship.last_contact}</p>
          </section>
          <section><h3 className="mb-2 font-semibold text-zinc-100">Experience</h3>
            {person.jobs.length ? <ol className="space-y-3 border-l border-zinc-700 pl-3">
              {person.jobs.map((job, i) => <li key={i}>
                <p className={job.nse_symbol ? 'font-semibold text-stock' : 'font-semibold text-zinc-200'}>{job.org}{job.nse_symbol && ` · ${job.nse_symbol}`}</p>
                <p>{job.role}</p><p className="text-[11px] text-zinc-400">{job.start_year}–{job.end_year ?? 'Present'}</p>
              </li>)}
            </ol> : <p>No roles supplied.</p>}
          </section>
          <section><h3 className="mb-2 font-semibold text-zinc-100">Education</h3>
            {person.education.length ? person.education.map((edu, i) => <p key={i} className="mb-2">{edu.school}{edu.degree && ` · ${edu.degree}`}{edu.year && ` · ${edu.year}`}</p>) : <p>No education supplied.</p>}
          </section>
          <section><h3 className="mb-2 font-semibold text-zinc-100">Expertise</h3>
            <div className="flex flex-wrap gap-2">{person.expertise.map(theme => <span key={theme} className="rounded border border-zinc-700 px-2 py-1 text-[11px]">{theme}</span>)}</div>
          </section>
        </div>}
      </div>
    </div>
  )
}
