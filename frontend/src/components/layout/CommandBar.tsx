import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCompaniesCatalog } from '@/api/client'
import type { NavTab } from '@/components/layout/MobileShell'

const commands: { tab: NavTab; label: string }[] = [
  { tab: 'today', label: 'TODAY' }, { tab: 'research', label: 'RESEARCH' },
  { tab: 'network', label: 'NETWORK' }, { tab: 'thresholds', label: 'SETTINGS' },
  { tab: 'stats', label: 'COST' }, { tab: 'profile', label: 'PROFILE' },
]
type Suggestion = { kind: 'command'; tab: NavTab; label: string } | { kind: 'company'; symbol: string; label: string }

export function CommandBar({ onTabChange, onOpenCompany }: {
  onTabChange: (tab: NavTab) => void; onOpenCompany: (symbol: string) => void
}) {
  const { data: companies = [] } = useQuery({ queryKey: ['companiesCatalog'], queryFn: fetchCompaniesCatalog, staleTime: 60_000 })
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const options = useMemo<Suggestion[]>(() => {
    const q = query.trim().toUpperCase()
    if (!q) return []
    return [
      ...companies.filter(company => company.symbol.includes(q) || company.name.toUpperCase().includes(q))
        .map(company => ({ kind: 'company' as const, symbol: company.symbol, label: company.name })),
      ...commands.filter(command => command.label.includes(q))
        .map(command => ({ kind: 'command' as const, ...command })),
    ].slice(0, 6)
  }, [companies, query])
  const select = (option: Suggestion) => {
    if (option.kind === 'company') onOpenCompany(option.symbol)
    else onTabChange(option.tab)
    setQuery('')
    setActive(0)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (options[active]) select(options[active])
  }
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(index + 1, options.length - 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, index - 1)) }
    if (event.key === 'Escape') { event.preventDefault(); setQuery(''); setActive(0) }
  }
  const expanded = query.trim().length > 0
  return (
    <div className="desk-command relative border-y border-zinc-700 bg-zinc-900 px-3 py-1">
      <form onSubmit={submit} className="flex items-center gap-2">
        <label htmlFor="desk-command-input" className="sr-only">Type a ticker or command</label>
        <span aria-hidden="true" className="font-mono text-xs text-zinc-400">&gt;</span>
        <input id="desk-command-input" type="text" role="combobox" autoComplete="off"
          aria-autocomplete="list" aria-expanded={expanded} aria-controls={listId}
          aria-activedescendant={expanded && options[active] ? `${listId}-${active}` : undefined}
          value={query} onChange={event => { setQuery(event.target.value); setActive(0) }} onKeyDown={keyDown}
          placeholder="Type a ticker or command"
          className="min-h-[44px] min-w-0 flex-1 rounded border border-zinc-500 bg-zinc-950 px-2 text-xs text-zinc-100 placeholder:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" />
        <button type="submit" disabled={!options.length} className="min-h-[44px] min-w-[44px] rounded bg-brand px-2 text-[11px] font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">GO</button>
      </form>
      {expanded && <ul id={listId} role="listbox" aria-label="Tickers and commands"
        className="absolute inset-x-3 top-full z-50 max-h-[280px] overflow-y-auto rounded-b border border-zinc-500 bg-zinc-900 shadow-lg">
        {options.map((option, index) => <li key={option.kind === 'company' ? option.symbol : option.tab} role="presentation">
          <button id={`${listId}-${index}`} type="button" role="option" aria-selected={active === index} tabIndex={-1}
            onMouseDown={event => event.preventDefault()} onClick={() => select(option)}
            className={`flex min-h-[44px] w-full items-center gap-2 border-b border-zinc-700 px-3 text-left text-xs ${active === index ? 'bg-brand-tint text-brand-text' : 'text-zinc-300'}`}>
            <span className={option.kind === 'company' ? 'shrink-0 font-mono font-semibold text-stock' : 'font-semibold'}>{option.kind === 'company' ? option.symbol : option.label}</span>
            {option.kind === 'company' && <span className="min-w-0 truncate text-zinc-400">{option.label}</span>}
          </button>
        </li>)}
        {!options.length && <li role="presentation" className="px-3 py-3 text-xs text-zinc-400">No matching ticker or command.</li>}
      </ul>}
    </div>
  )
}
