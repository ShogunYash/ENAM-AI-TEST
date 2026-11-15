import { useId, useState, type FormEvent } from 'react'
import { Check, Copy, Send } from 'lucide-react'
import { askNetwork, SYNTHETIC_NOTE, useExpertise, useNetworkPeople, useWarmNudges } from '@/api/network'
import type { NetworkAskResponse, WarmNudge } from '@/api/types'
import { PersonMatchRow, Strength } from './PersonMatchRow'
import { useOpenPerson } from './PersonProvider'

function WarmCard({ nudge }: { nudge: WarmNudge }) {
  const openPerson = useOpenPerson()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(nudge.opener)
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }
  return (
    <article className="border-t border-zinc-700 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => openPerson(nudge.person_id)}
          className="min-h-[44px] text-left text-sm font-semibold text-zinc-100 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">{nudge.name}</button>
        <button type="button" onClick={copy} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded px-2 text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 font-mono text-[11px] text-stock">{nudge.symbol}</span>
        <p title={nudge.trigger} className="truncate text-sm leading-5 text-zinc-200">{nudge.trigger}</p>
      </div>
      <details>
        <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          <span>Opener</span>
          <span className="text-right text-[11px] text-zinc-400">last spoke {nudge.days_since} days ago</span>
        </summary>
        <p className="text-zinc-400">{nudge.headline}</p>
        <p className="mt-2 leading-relaxed text-zinc-200">{nudge.trigger}</p>
        <blockquote className="mt-2 border-l-2 border-zinc-700 pl-3 leading-relaxed text-zinc-300">{nudge.opener}</blockquote>
      </details>
      {copyError && <p role="status" className="text-[11px] text-zinc-400">Open the opener above to select and copy it.</p>}
    </article>
  )
}

export function NetworkScreen() {
  const people = useNetworkPeople()
  const warm = useWarmNudges()
  const expertise = useExpertise()
  const openPerson = useOpenPerson()
  const [showAllWarm, setShowAllWarm] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<NetworkAskResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [showAllThemes, setShowAllThemes] = useState(false)
  const [themeSearch, setThemeSearch] = useState('')
  const [theme, setTheme] = useState<string | null>(null)
  const stepsId = useId()
  const memberId = useId()
  const selected = expertise.data?.find(item => item.theme === theme)
  const submit = async (text: string) => {
    if (busy || !text.trim()) return
    setQuestion(text)
    setBusy(true)
    setAnswer(null)
    setOffline(false)
    setShowSteps(false)
    try {
      const result = await askNetwork(text.trim())
      if ('offline' in result) setOffline(true)
      else setAnswer(result)
    } catch {
      setOffline(true)
    } finally {
      setBusy(false)
    }
  }
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submit(question)
  }
  const themes = [...(expertise.data ?? [])].sort((a, b) => b.members.length - a.members.length || a.theme.localeCompare(b.theme))
  const visibleThemes = themeSearch.trim()
    ? themes.filter(item => item.theme.toLowerCase().includes(themeSearch.trim().toLowerCase()))
    : showAllThemes ? themes : themes.slice(0, 8)
  return (
    <div className="space-y-2 pb-24 pt-1">
      <header><h1 className="text-xl font-semibold text-zinc-100">Network</h1>
        <p className="mt-1 text-[11px] text-zinc-400">{SYNTHETIC_NOTE}{people.data && ` · ${people.data.length} people`}</p>
      </header>
      <section aria-labelledby="ask-network-title">
        <h2 id="ask-network-title" className="mb-2 text-base font-semibold text-zinc-100">Ask your network</h2>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label htmlFor="network-question" className="sr-only">Ask your network</label>
          <input id="network-question" value={question} onChange={event => setQuestion(event.target.value)}
            placeholder="A company, a theme, or a person" maxLength={2000}
            className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-100 placeholder:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" />
          <button type="submit" disabled={busy || !question.trim()} aria-label="Send network question"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-brand text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            <Send aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-2">
          {['Who knows Bajaj Finance?', 'wires and cables', 'Who should I reconnect with?'].map(chip => <button key={chip} type="button" disabled={busy}
            onClick={() => void submit(chip)} className="min-h-[44px] rounded-lg border border-zinc-700 px-2 text-[11px] text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">{chip}</button>)}
        </div>
        <div role="status" aria-live="polite">
          {busy && <p className="mt-3 text-xs text-zinc-400 motion-safe:animate-pulse">Looking through your network…</p>}
          {offline && <p className="mt-3 text-xs leading-relaxed text-zinc-300">Asking needs the live API. Browse the expertise map below.</p>}
        </div>
        {answer && <div className="mt-3 border-t border-zinc-700 pt-3">
          <p className="text-sm leading-relaxed text-zinc-200" role="status">{answer.answer}</p>
          <div className="divide-y divide-zinc-700">{answer.matches.map(match => <PersonMatchRow key={match.person_id} match={match} />)}</div>
          {!answer.matches.length && <p className="mt-2 text-xs text-zinc-400">No matching contacts returned.</p>}
          <button type="button" onClick={() => setShowSteps(!showSteps)} aria-expanded={showSteps} aria-controls={stepsId}
            className="min-h-[44px] rounded text-[11px] text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">How FINN found this</button>
          {showSteps && <ol id={stepsId} className="space-y-2 border-l border-zinc-700 pl-3 text-[11px] text-zinc-400">
            {answer.steps.length ? answer.steps.map((step, i) => <li key={i}><span className="font-mono text-zinc-200">{step.tool}</span><p className="mt-1 leading-relaxed">{step.summary}</p></li>) : <li>No tool steps returned.</li>}
          </ol>}
        </div>}
      </section>
      <section aria-labelledby="warm-title">
        <h2 id="warm-title" className="text-base font-semibold text-zinc-100">Keep warm</h2>
        {warm.isLoading && <p className="py-3 text-xs text-zinc-400 motion-safe:animate-pulse">Loading reconnect suggestions…</p>}
        {warm.isError && <p className="py-3 text-xs text-zinc-400">Reconnect suggestions are unavailable.</p>}
        {warm.data?.length === 0 && <p className="py-3 text-xs text-zinc-400">No reconnect suggestions right now.</p>}
        <div id="warm-items">
          {(showAllWarm ? warm.data : warm.data?.slice(0, 3))?.map(nudge => <WarmCard key={nudge.person_id} nudge={nudge} />)}
        </div>
        {warm.data && warm.data.length > 3 && (
          <button type="button" aria-expanded={showAllWarm} aria-controls="warm-items" onClick={() => setShowAllWarm(!showAllWarm)}
            className="min-h-[44px] w-full rounded border-t border-zinc-700 text-left text-xs text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            {showAllWarm ? 'Show fewer' : `Show all (${warm.data.length})`}
          </button>
        )}
      </section>
      <section aria-labelledby="expertise-title">
        <h2 id="expertise-title" className="mb-2 text-base font-semibold text-zinc-100">Expertise map</h2>
        {expertise.isLoading && <p className="py-3 text-xs text-zinc-400 motion-safe:animate-pulse">Loading expertise…</p>}
        {expertise.isError && <p className="py-3 text-xs text-zinc-400">Expertise is unavailable.</p>}
        {themes.length === 0 && !expertise.isLoading && !expertise.isError && <p className="py-3 text-xs text-zinc-400">No expertise themes supplied.</p>}
        <label htmlFor="theme-search" className="sr-only">Search expertise themes</label>
        <input id="theme-search" type="search" value={themeSearch} onChange={event => setThemeSearch(event.target.value)}
          placeholder="Search all themes"
          className="mb-2 min-h-[44px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-100 placeholder:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" />
        {themes.length > 0 && visibleThemes.length === 0 && <p className="py-2 text-xs text-zinc-400">No themes match. Try another search.</p>}
        <div id="expertise-themes" className="flex flex-wrap gap-2">
          {visibleThemes.map(item => <button key={item.theme} type="button" aria-expanded={theme === item.theme} aria-controls={memberId}
            onClick={() => setTheme(theme === item.theme ? null : item.theme)}
            className={`min-h-[44px] rounded-lg border px-2 text-left text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${theme === item.theme ? 'border-brand bg-brand-tint font-semibold text-brand-text' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}>
            {item.theme} <span className="font-mono">({item.members.length})</span>
          </button>)}
        </div>
        {!themeSearch.trim() && themes.length > 8 && (
          <button type="button" aria-expanded={showAllThemes} aria-controls="expertise-themes" onClick={() => setShowAllThemes(!showAllThemes)}
            className="min-h-[44px] w-full rounded text-left text-xs text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            {showAllThemes ? 'Fewer themes' : 'More themes'}
          </button>
        )}
        {selected && <div id={memberId} className="mt-3 border-t border-zinc-700 pt-2">
          <h3 className="py-2 text-xs font-semibold text-zinc-200">{selected.theme}</h3>
          <ul className="divide-y divide-zinc-700">{selected.members.map(member => <li key={member.person_id} className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => openPerson(member.person_id)} className="min-h-[44px] rounded text-left text-sm font-semibold text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">{member.name}</button>
            <Strength value={member.strength} />
          </li>)}</ul>
          <p className="mt-2 text-[11px] text-zinc-400">Tracked companies</p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-stock">{selected.companies.length ? selected.companies.join(' · ') : 'No tracked companies in this theme.'}</p>
        </div>}
      </section>
    </div>
  )
}
