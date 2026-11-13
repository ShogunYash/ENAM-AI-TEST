import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchLlmStats } from '@/api/client'
import { Coins, Zap, Activity, ChevronDown } from 'lucide-react'
import { AsOfChip } from '@/components/common/AsOfChip'

export const StatsScreen: React.FC = () => {
  const {
    data: statsResult,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchLlmStats,
    staleTime: 1000 * 15,
  })

  if (isLoading && !statsResult) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-8 bg-zinc-900 rounded-lg w-32"></div>
        <div className="h-28 bg-zinc-900 rounded-xl"></div>
        <div className="h-40 bg-zinc-900 rounded-xl"></div>
      </div>
    )
  }

  const stats = statsResult?.data
  if (!stats) return null

  const { totals, by_model, by_feature, avg_calls_new_ticker, grounding_dropped, as_of } = stats

  let stateLabel = 'LIVE'
  if (statsResult.provenance === 'mock') {
    stateLabel = 'DEMO DATA'
  } else if (statsResult.provenance === 'snapshot') {
    stateLabel = 'SNAPSHOT'
  }

  const activeModels = by_model.filter((m) => m.calls > 0)
  const unusedModels = by_model.filter((m) => m.calls === 0)

  return (
    <div className="space-y-3.5 pb-24 pt-1">
      {/* Header with Full-Width Title and Provenance As-Of Chip */}
      <div className="pb-2 border-b border-zinc-800 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-zinc-300" />
            AI cost and usage
          </h1>
          <AsOfChip
            asOf={as_of}
            label={stateLabel}
            isRefreshing={isFetching}
            onRefresh={() => refetch()}
          />
        </div>
        <p className="text-xs text-zinc-400">
          Spending, calls and reuse
        </p>
      </div>

      {/* Top Stat Cards: Spend & Cache Hit Rate */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Coins className="w-3 h-3 text-emerald-400" />
            <span>Model API spend</span>
          </div>
          <div className="text-lg font-mono font-bold text-zinc-100">
            ₹{totals.spend_inr.toFixed(2)}
          </div>
          <p className="text-[10px] text-emerald-400 font-medium">
            Free tiers and local models
          </p>
        </div>

        <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Answers reused</span>
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-lg font-mono font-bold text-zinc-100">
              {totals.cache_hit_pct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({totals.cache_hits} of {totals.calls + totals.cache_hits} requests)
            </span>
          </div>
        </div>
      </div>

      {/* 2x2 Grid of Key Metrics */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs">
        <div className="space-y-0.5">
          <div className="text-[11px] text-zinc-400">Model calls</div>
          <div className="font-mono text-zinc-200 font-bold text-sm">{totals.calls} calls</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[11px] text-zinc-400">Input and output tokens</div>
          <div className="font-mono text-zinc-200 font-bold text-sm">
            {(totals.tokens_in + totals.tokens_out).toLocaleString()}
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[11px] text-zinc-400">Calls per new ticker</div>
          <div className="font-mono text-zinc-200 font-bold text-sm">
            {avg_calls_new_ticker ? avg_calls_new_ticker.toFixed(1) : 'Not measured'}
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[11px] text-zinc-400">Claims left out (no verified quote)</div>
          <div className="font-mono text-zinc-200 font-bold text-sm">
            {grounding_dropped} claims
          </div>
        </div>
      </div>

      {/* Router Calls by Model */}
      <section className="space-y-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
          Usage by model
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden divide-y divide-zinc-800/60 text-xs">
          {activeModels.map((row) => (
            <div key={row.key} className="px-3 py-2 flex items-center justify-between">
              <div className="font-mono font-medium text-zinc-200 text-xs truncate max-w-[210px]" title={row.key}>
                {row.key}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 flex-shrink-0">
                <span>{(row.tokens_in + row.tokens_out).toLocaleString()} tok</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 font-bold text-zinc-200">
                  {row.calls} calls
                </span>
              </div>
            </div>
          ))}

          {unusedModels.length > 0 && (
            <details className="group border-t border-zinc-800/60">
              <summary className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-400 cursor-pointer flex items-center justify-between select-none">
                <span>Models not used yet ({unusedModels.length})</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-zinc-500" />
              </summary>
              <div className="divide-y divide-zinc-800/40 bg-zinc-950/40">
                {unusedModels.map((row) => (
                  <div key={row.key} className="px-3 py-1.5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span className="truncate max-w-[220px]" title={row.key}>{row.key}</span>
                    <span>0 calls</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="space-y-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
          Calls by task
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden divide-y divide-zinc-800/60 text-xs">
          {by_feature.map((row) => (
            <div key={row.key} className="px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-zinc-300 capitalize">
                {row.key.replace(/_/g, ' ')}
              </span>
              <span className="font-mono font-bold text-zinc-200">
                {row.calls} calls
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
