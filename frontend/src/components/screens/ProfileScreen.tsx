import { PrivacyCard } from '@/components/network/PrivacyCard'
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ShieldCheck, Trash2, User } from 'lucide-react'
import { fetchCompaniesCatalog, fetchHealth } from '@/api/client'
import type { CatalogCompany } from '@/api/client'
import { initialsOf, setProfileName, useProfileName } from '@/lib/profile'
import { formatExactIst } from '@/lib/formatters'

const SOURCES: Array<[string, string]> = [
  ['Filings', 'BSE corporate announcements'],
  ['Prices', 'Yahoo Finance end-of-day bars'],
  ['Financials', 'screener.in tables'],
  ['Research', 'Earnings-call transcripts and annual reports only'],
]

type OpenList = 'portfolio' | 'watchlist' | null

export const ProfileScreen: React.FC = () => {
  const name = useProfileName()
  const [draft, setDraft] = useState(name)
  const [open, setOpen] = useState<OpenList>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const { data: catalog = [] } = useQuery({ queryKey: ['catalog'], queryFn: fetchCompaniesCatalog })
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

  const holdings = catalog.filter((c) => c.in_portfolio)
  const watch = catalog.filter((c) => !c.in_portfolio)
  const initials = initialsOf(name)
  const saved = draft.trim() === name

  const resetAll = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('finn'))
        .forEach((k) => localStorage.removeItem(k))
    } catch {}
    window.location.hash = '#today'
    window.location.reload()
  }

  const renderList = (rows: CatalogCompany[], key: Exclude<OpenList, null>, title: string) => (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60">
      <button
        type="button"
        onClick={() => setOpen(open === key ? null : key)}
        aria-expanded={open === key}
        className="w-full min-h-[48px] px-3 flex items-center justify-between touch-manipulation"
      >
        <span className="text-sm font-semibold text-zinc-100">{title}</span>
        <span className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          {rows.length} stocks
          <ChevronDown className={`w-4 h-4 transition-transform ${open === key ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open === key && (
        <ul className="px-3 pb-2 divide-y divide-zinc-800/70">
          {rows.map((c) => (
            <li key={c.symbol} className="py-1.5 flex items-baseline justify-between gap-2 text-xs">
              <span>
                <strong className="font-mono text-stock">{c.symbol}</strong>{' '}
                <span className="text-zinc-300">{c.name}</span>
              </span>
              <span className="text-zinc-500 text-right">{c.sector}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="space-y-4 pb-24 pt-1">
      <div className="pb-2 border-b border-zinc-800">
        <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <User className="w-4 h-4 text-zinc-300" />
          Profile
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">Stored on this device only · no account needed</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
          {initials || <User className="w-5 h-5" />}
        </div>
        <form
          className="flex-1 flex items-center gap-2 min-w-0"
          onSubmit={(e) => {
            e.preventDefault()
            setProfileName(draft)
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={40}
            placeholder="Your name"
            aria-label="Your name"
            className="flex-1 min-w-0 min-h-[44px] px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={saved}
            className="min-h-[44px] px-3 rounded-lg bg-brand text-white text-xs font-semibold disabled:opacity-40 touch-manipulation"
          >
            Save
          </button>
        </form>
      </div>

      {renderList(holdings, 'portfolio', 'My portfolio')}
      {renderList(watch, 'watchlist', 'Watchlist')}

      <PrivacyCard />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Where the data comes from
        </h2>
        <dl className="text-xs space-y-1">
          {SOURCES.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-zinc-400">{k}</dt>
              <dd className="text-zinc-200 text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          No news, no broker notes. Every research claim carries a quote checked against the document page.
        </p>
        <p className="text-[11px] text-zinc-500 font-mono">
          {health?.mode === 'live' ? 'Live API' : 'Offline snapshot'}
          {health?.as_of ? ` · prices as of ${formatExactIst(health.as_of)}` : ''}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        {confirmReset ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-300">Clear your name, thresholds and view choices on this device?</p>
            <div className="flex gap-2">
              <button
                onClick={resetAll}
                className="min-h-[44px] px-3 rounded-lg bg-rose-600 text-white text-xs font-semibold touch-manipulation"
              >
                Clear everything
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="min-h-[44px] px-3 rounded-lg bg-zinc-800 text-zinc-200 text-xs touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full min-h-[44px] flex items-center justify-between text-xs text-zinc-300 touch-manipulation"
          >
            <span>Clear my data on this device</span>
            <Trash2 className="w-4 h-4 text-zinc-400" />
          </button>
        )}
      </div>
    </div>
  )
}
