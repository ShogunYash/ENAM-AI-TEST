import React, { useState, useEffect } from 'react'
import { Coins, Zap, ShieldCheck, Activity } from 'lucide-react'

export const StatsScreen: React.FC = () => {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/stats.json')
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load stats', err)
        setLoading(false)
      })
  }, [])

  if (loading || !stats) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-8 bg-zinc-900 rounded-lg w-32"></div>
        <div className="h-28 bg-zinc-900 rounded-xl"></div>
        <div className="h-40 bg-zinc-900 rounded-xl"></div>
      </div>
    )
  }

  const { totals, by_model, by_feature, avg_calls_new_ticker, grounding_dropped } = stats

  return (
    <div className="space-y-4 pb-24 pt-1">
      <div className="pb-2 border-b border-zinc-800">
        <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-300" />
          LLM Cost & Efficiency Ledger
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Zero marginal cost architecture · Strict cache-first router
        </p>
      </div>

      {/* Top Stat Cards */}
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
          <div className="text-lg font-mono font-bold text-zinc-100">
            {totals.cache_hit_pct.toFixed(1)}%
          </div>
          <p className="text-[10px] text-zinc-400 font-mono">
            {totals.cache_hits} hits / {totals.calls + totals.cache_hits} queries
          </p>
        </div>
      </div>

      {/* Totals Banner */}
      <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs space-y-2">
        <div className="flex justify-between items-center text-zinc-300">
          <span className="text-zinc-400">Total Tokens</span>
          <span className="font-mono text-zinc-100">
            {((totals.tokens_in + totals.tokens_out) / 1000).toFixed(1)}k tokens
          </span>
        </div>
        <div className="flex justify-between items-center text-zinc-300">
          <span className="text-zinc-400">Avg Calls per New Ticker</span>
          <span className="font-mono text-zinc-100">{avg_calls_new_ticker} calls</span>
        </div>
        <div className="flex justify-between items-center text-zinc-300">
          <span className="text-zinc-400">Unverified Claims Dropped</span>
          <span className="font-mono text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            {grounding_dropped} dropped (strict quote filter)
          </span>
        </div>
      </div>

      {/* By Model */}
      <section className="space-y-2">
        <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider px-1">
          Model Utilization
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800/60 overflow-hidden text-xs">
          {by_model?.map((m: any) => (
            <div key={m.key} className="p-2.5 flex items-center justify-between">
              <div>
                <div className="font-mono font-medium text-zinc-200">{m.key}</div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {m.cache_hits} cache hits
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-zinc-200 font-semibold">{m.calls} calls</div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {Math.round((m.tokens_in + m.tokens_out) / 1000)}k tokens
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* By Feature */}
      <section className="space-y-2">
        <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider px-1">
          Feature Cost Breakdown
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800/60 overflow-hidden text-xs">
          {by_feature?.map((f: any) => (
            <div key={f.key} className="p-2.5 flex items-center justify-between">
              <span className="font-mono text-zinc-300">{f.key}</span>
              <div className="text-right">
                <span className="font-mono text-zinc-200 font-medium">{f.calls} calls</span>
                <span className="text-[10px] text-zinc-500 font-mono ml-2">
                  ({f.cache_hits} cached)
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
