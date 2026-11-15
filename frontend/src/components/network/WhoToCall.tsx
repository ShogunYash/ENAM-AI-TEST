import { Info } from 'lucide-react'
import { SYNTHETIC_NOTE, useCompanyNetwork } from '@/api/network'
import { PersonMatchRow } from './PersonMatchRow'

export function WhoToCall({ symbol, name }: { symbol: string; name?: string | null }) {
  const { data, isLoading, isError } = useCompanyNetwork(symbol)
  if (isError || (!isLoading && !data?.matches.length)) return null
  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-3.5">
      <h2 className="text-sm font-semibold text-zinc-100">Who to call about {name || symbol}</h2>
      <p className="mt-1 text-[11px] text-zinc-400">{SYNTHETIC_NOTE}</p>
      {isLoading ? <div role="status" aria-label="Loading network contacts" className="mt-3 space-y-2 motion-safe:animate-pulse"><div className="h-4 w-2/3 rounded bg-zinc-800" /><div className="h-4 rounded bg-zinc-800" /></div>
        : <div className="divide-y divide-zinc-700">{data?.matches.slice(0, 3).map(match => <PersonMatchRow key={match.person_id} match={match} />)}</div>}
      {data?.note && <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-400"><Info className="h-4 w-4 shrink-0" />{data.note}</p>}
    </section>
  )
}
