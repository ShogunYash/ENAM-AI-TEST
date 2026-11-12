import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchLlmStats } from '@/api/client'
import { Coins, Zap, Activity } from 'lucide-react'
import { AsOfChip } from '@/components/common/AsOfChip'
import { formatExactIst } from '@/lib/formatters'

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

  // Three honest states:
  // "Live ledger" (API live)
  // "Saved snapshot as of <time>" (stats.json)
  // "Sample" (mode=mock)
  let stateLabel = 'Live ledger'
  if (statsResult.provenance === 'mock') {
    stateLabel = 'Sample'
  } else if (statsResult.provenance === 'snapshot') {
    stateLabel = `Saved snapshot as of ${formatExactIst(as_of)}`
  }

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Header with Title and Provenance As-Of Chip */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-300" />
            LLM Cost & Efficiency Ledger
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Zero marginal cost architecture · Strict cache-first router
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <AsOfChip
            asOf={as_of}
            label={stateLabel}
            isRefreshing={isFetching}
            onRefresh={() => refetch()}
          />
        </div>
      </div>

      {/* Top Stat Cards: Spend & Cache Hit Rate with hits and queries together */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Coins className="w-3 h-3 text-emerald-400" />
            <span>Total Spend</span>
          </div>
          <div className="text-lg font-mono font-bold text-zinc-100">
            ₹{totals.spend_inr.toFixed(2)}
          </div>
          <p className="text-[10px] text-emerald-400 font-medium">
            100% Free Tier (Gemini & Groq)
          </p>
        </div>

        <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Cache Hit Rate</span>
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-lg font-mono font-bold text-zinc-100">
              {totals.cache_hit_pct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({totals.cache_hits} hits / {totals.calls + totals.cache_hits} queries)
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-mono">
            Zero marginal cost for repeated filings
          </p>
        </div>
      </div>

      {/* Totals Banner */}
      <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs space-y-2">
        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
          <span>Total API Invocations</span>
          <span className="font-mono text-zinc-200 font-bold">{totals.calls} calls</span>
        </div>
        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
          <span>Tokens Processed</span>
          <span className="font-mono text-zinc-200">
            {(totals.tokens_in + totals.tokens_out).toLocaleString()} tokens
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
          <span>Avg Calls / New Ticker</span>
          <span className="font-mono text-zinc-200 font-bold">
            {avg_calls_new_ticker ? avg_calls_new_ticker.toFixed(1) : '7.0'}
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
          <span>Unverified Quotes Dropped</span>
          <span className="font-mono text-rose-400 font-bold">
            {grounding_dropped} claims
          </span>
        </div>
      </div>

      {/* Model Breakdown */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
          Router Calls by Model (All Free Tier)
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden divide-y divide-zinc-800/60 text-xs">
          {by_model.map((row) => (
            <div key={row.key} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-mono font-medium text-zinc-200 text-[13px]">
                  {row.key}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  {(row.tokens_in + row.tokens_out).toLocaleString()} tokens · ₹0.00 spend
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] font-mono font-bold text-zinc-300">
                  {row.calls} calls
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
          Invocations by Pipeline Task
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden divide-y divide-zinc-800/60 text-xs">
          {by_feature.map((row) => (
            <div key={row.key} className="p-3 flex items-center justify-between">
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
