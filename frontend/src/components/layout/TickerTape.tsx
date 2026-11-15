import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchSnapshotPrices } from '@/api/client'

export function TickerTape() {
  const { data } = useQuery({ queryKey: ['tape-prices'], queryFn: fetchSnapshotPrices, staleTime: 60_000, retry: false })
  const [paused, setPaused] = useState(false)
  const prices = data?.filter(price => Number.isFinite(price.close) && Number.isFinite(price.pct_1d))
  if (!prices?.length) return null
  const items = prices.map(price => {
    const up = price.pct_1d >= 0
    return <span key={price.symbol} className="desk-tape-item inline-flex h-6 shrink-0 items-center gap-2 px-3 font-mono text-[11px] tabular-nums">
      <span className="text-stock">{price.symbol}</span>
      <span className="text-zinc-200">{price.close.toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span>
      <span className={up ? 'text-emerald-400' : 'text-rose-400'}>{up ? '▲+' : '▼−'}{Math.abs(price.pct_1d).toFixed(1)}%</span>
    </span>
  })
  return (
    <div className="desk-tape border-b border-zinc-700 bg-zinc-950" role="region" aria-label="Portfolio prices" data-paused={paused}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setPaused(true) }}
      onPointerUp={() => setPaused(false)} onPointerCancel={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="desk-tape-track">
        <div className="desk-tape-group">{items}</div>
        <div className="desk-tape-group desk-tape-duplicate" aria-hidden="true">{items}</div>
      </div>
    </div>
  )
}
