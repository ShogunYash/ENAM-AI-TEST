import { useQuery } from '@tanstack/react-query'
import { fetchLlmStats } from '@/api/client'
import { AsOfChip } from '@/components/common/AsOfChip'
import { PanelHeader } from '@/components/ui/Desk'

export function StatsScreen() {
  const { data: result, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['stats'], queryFn: fetchLlmStats, staleTime: 15_000,
  })
  if (isLoading && !result) return <p role="status" className="py-3 text-xs text-zinc-400">Loading recorded usage…</p>
  if (!result) return <p role="status" className="py-3 text-xs text-zinc-400">Recorded usage is unavailable.</p>

  const { totals, by_model, by_feature, avg_calls_new_ticker, grounding_dropped, as_of } = result.data
  const active = by_model.filter(row => row.calls > 0)
  const unused = by_model.filter(row => row.calls === 0)
  const label = result.provenance === 'mock' ? 'DEMO DATA' : result.provenance === 'snapshot' ? 'SNAPSHOT' : 'LIVE'
  const metrics = [
    ['Model calls', `${totals.calls} calls`],
    ['Input and output tokens', (totals.tokens_in + totals.tokens_out).toLocaleString('en-IN')],
    ['Calls per new ticker', avg_calls_new_ticker ? avg_calls_new_ticker.toFixed(1) : 'Not measured'],
    ['Claims left out (no verified quote)', `${grounding_dropped} claims`],
  ]
  return (
    <div className="desk-screen">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-100">AI cost and usage</h1>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-zinc-400">Spending, calls and reuse</p>
          <AsOfChip asOf={as_of} label={label} isRefreshing={isFetching} onRefresh={() => refetch()} />
        </div>
      </header>
      <section className="desk-panel">
        <PanelHeader title="Recorded usage" code="CST" />
        <div className="grid grid-cols-2 divide-x divide-zinc-700">
          <div className="p-3">
            <p className="desk-metric-label">Model API spend</p>
            <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-zinc-100">₹{totals.spend_inr.toFixed(2)}</p>
            <p className="mt-2 text-[11px] text-zinc-400">Free tiers and local models</p>
          </div>
          <div className="p-3">
            <p className="desk-metric-label">Answers reused</p>
            <p className="mt-2 font-mono text-base font-semibold tabular-nums text-zinc-100">{totals.cache_hit_pct.toFixed(1)}%</p>
            <p className="mt-2 font-mono text-[11px] text-zinc-400">({totals.cache_hits} of {totals.calls + totals.cache_hits} requests)</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-zinc-700 bg-zinc-800/50">
          {metrics.map(([name, value]) => <div key={name} className="desk-metric">
            <dt className="text-[11px] text-zinc-400">{name}</dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-zinc-100">{value}</dd>
          </div>)}
        </dl>
      </section>
      <section className="desk-panel">
        <PanelHeader title="Usage by model" count={active.length} code="CST" />
        <table className="desk-ledger w-full table-fixed text-xs">
          <caption className="sr-only">Model calls and combined input and output tokens</caption>
          <thead><tr><th scope="col" className="w-[46%]">Model</th><th scope="col">Tokens</th><th scope="col">Calls</th></tr></thead>
          <tbody>{active.map(row => <tr key={row.key}>
            <th scope="row" title={row.key} className="truncate font-normal">{row.key}</th>
            <td>{(row.tokens_in + row.tokens_out).toLocaleString('en-IN')}</td><td>{row.calls}</td>
          </tr>)}</tbody>
        </table>
        {unused.length > 0 && <details className="border-t border-zinc-700">
          <summary className="flex min-h-[44px] cursor-pointer items-center px-3 text-xs text-zinc-400">Models not used yet ({unused.length})</summary>
          <ul className="divide-y divide-zinc-700 bg-zinc-800/50">{unused.map(row => <li key={row.key} className="flex justify-between gap-2 px-3 py-2 text-[11px] text-zinc-400">
            <span className="min-w-0 truncate" title={row.key}>{row.key}</span><span className="shrink-0 font-mono">0 calls</span>
          </li>)}</ul>
        </details>}
      </section>
      <section className="desk-panel">
        <PanelHeader title="Calls by task" count={by_feature.length} code="CST" />
        <table className="desk-ledger w-full table-fixed text-xs">
          <caption className="sr-only">Model calls by task</caption>
          <thead><tr><th scope="col" className="w-2/3">Task</th><th scope="col">Calls</th></tr></thead>
          <tbody>{by_feature.map(row => <tr key={row.key}><th scope="row" className="font-normal capitalize">{row.key.replace(/_/g, ' ')}</th><td>{row.calls} calls</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  )
}
