import React, { useMemo, useState } from 'react'
import { CHART_RANGES, usePriceChart } from '@/api/charts'
import type { ChartRange } from '@/api/charts'
import { PanelHeader } from '@/components/ui/Desk'

const W = 340
const H = 132
const PAD_X = 4
const PAD_TOP = 8
const PAD_BOTTOM = 22

const RANGE_LABEL: Record<ChartRange, string> = { '1d': '1D', '3d': '3D', '7d': '7D', '30d': '30D' }
const RANGE_KEY = 'finn.chartRange'

function readRange(): ChartRange {
  try {
    const v = localStorage.getItem(RANGE_KEY) as ChartRange | null
    if (v && CHART_RANGES.includes(v)) return v
  } catch {
    // ignore
  }
  return '1d'
}

const price = (v: number) =>
  `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const dayLabel = (t: string) => {
  const d = new Date(t.length === 10 ? `${t}T12:00:00+05:30` : t)
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })
}

const timeLabel = (t: string) => {
  if (t.length === 10) return dayLabel(t)
  const d = new Date(t)
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
  return `${dayLabel(t)}, ${time} IST`
}

interface Props {
  symbol: string
}

/**
 * Price chart for a tracked stock: 1D / 3D / 7D / 30D. x is the point index (so overnight gaps do not draw flat
 * lines); session boundaries are marked; the dashed line is the close before the window. Touch or drag to read a point.
 */
export const PriceChart: React.FC<Props> = ({ symbol }) => {
  const [range, setRange] = useState<ChartRange>(readRange)
  const [scrub, setScrub] = useState<number | null>(null)
  const { data, isLoading } = usePriceChart(symbol, range)

  const pick = (r: ChartRange) => {
    setRange(r)
    setScrub(null)
    try {
      localStorage.setItem(RANGE_KEY, r)
    } catch {
      // ignore
    }
  }

  const geo = useMemo(() => {
    const pts = data?.points ?? []
    if (pts.length < 2) return null
    const last = pts[pts.length - 1].c
    const base = data?.change_pct != null && data.change_pct !== -100 ? last / (1 + data.change_pct / 100) : null
    const values = pts.map((p) => p.c).concat(base != null ? [base] : [])
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const span = hi - lo || 1
    const x = (i: number) => PAD_X + (i / (pts.length - 1)) * (W - 2 * PAD_X)
    const y = (v: number) => PAD_TOP + (1 - (v - lo) / span) * (H - PAD_TOP - PAD_BOTTOM)
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.c).toFixed(1)}`).join(' ')
    const area = `${line} L${x(pts.length - 1).toFixed(1)} ${H - PAD_BOTTOM} L${x(0).toFixed(1)} ${H - PAD_BOTTOM} Z`
    const ticks: { i: number; label: string }[] = []
    if (data?.source === 'intraday') {
      pts.forEach((p, i) => {
        if (i === 0 || p.t.slice(0, 10) !== pts[i - 1].t.slice(0, 10)) ticks.push({ i, label: dayLabel(p.t) })
      })
    } else {
      ;[0, Math.floor((pts.length - 1) / 2), pts.length - 1].forEach((i) => ticks.push({ i, label: dayLabel(pts[i].t) }))
    }
    return { pts, line, area, x, y, base, ticks }
  }, [data])

  const shown = scrub != null && geo ? geo.pts[scrub] : geo ? geo.pts[geo.pts.length - 1] : null
  const baseline = geo?.base ?? null
  const shownChange = shown && baseline ? ((shown.c - baseline) / baseline) * 100 : data?.change_pct ?? null
  const up = (shownChange ?? 0) >= 0
  const tone = up ? 'text-emerald-500' : 'text-rose-500'

  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geo) return
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setScrub(Math.max(0, Math.min(geo.pts.length - 1, Math.round(rel * (geo.pts.length - 1)))))
  }

  if (!isLoading && !data) return null // not a tracked stock: no chart, no empty box

  return (
    <section className="desk-panel" aria-label={`${symbol} price chart`}>
      <PanelHeader title="Price" code="PRC" count={RANGE_LABEL[range]} />
      <div className="p-3 space-y-2">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            {shown ? (
              <>
                <div className="font-mono text-lg font-semibold tabular-nums text-zinc-100">{price(shown.c)}</div>
                <div className="text-[11px] text-zinc-400 font-mono">{timeLabel(shown.t)}</div>
              </>
            ) : (
              <div className="text-sm text-zinc-400">{isLoading ? 'Loading price…' : 'No price history for this stock'}</div>
            )}
          </div>
          {shownChange != null && (
            <div className={`font-mono text-sm font-semibold tabular-nums ${tone}`}>
              <span aria-hidden="true">{up ? '▲' : '▼'}</span>
              {up ? '+' : '−'}
              {Math.abs(shownChange).toFixed(2)}%
              <span className="sr-only"> {up ? 'up' : 'down'}</span>
            </div>
          )}
        </div>

        <div role="group" aria-label="Chart range" className="inline-flex rounded-lg border border-zinc-600 bg-zinc-900 p-0.5">
          {CHART_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => pick(r)}
              className={`min-h-[44px] min-w-[52px] rounded-md px-3 text-xs font-semibold touch-manipulation ${
                range === r ? 'bg-brand-tint text-brand-text border border-brand' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        {geo ? (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`${symbol} ${RANGE_LABEL[range]} price, from ${price(geo.pts[0].c)} to ${price(geo.pts[geo.pts.length - 1].c)}, ${
                data?.change_pct != null ? `${data.change_pct >= 0 ? 'up' : 'down'} ${Math.abs(data.change_pct).toFixed(2)} percent` : ''
              }`}
              className="w-full h-auto select-none"
              style={{ touchAction: 'pan-y' }}
              onPointerDown={onPointer}
              onPointerMove={onPointer}
              onPointerLeave={() => setScrub(null)}
              onPointerCancel={() => setScrub(null)}
            >
              {baseline != null && (
                <line x1={PAD_X} x2={W - PAD_X} y1={geo.y(baseline)} y2={geo.y(baseline)} strokeDasharray="3 3" className="stroke-zinc-500" strokeWidth="1" />
              )}
              {geo.ticks.map((t) => (
                <g key={t.i}>
                  <line x1={geo.x(t.i)} x2={geo.x(t.i)} y1={PAD_TOP} y2={H - PAD_BOTTOM} className="stroke-zinc-700" strokeWidth="1" />
                  <text
                    x={Math.min(Math.max(geo.x(t.i), PAD_X + 2), W - 34)}
                    y={H - 6}
                    className="fill-zinc-400"
                    fontSize="11"
                    fontFamily="ui-monospace, monospace"
                  >
                    {t.label}
                  </text>
                </g>
              ))}
              <path d={geo.area} className={`${tone} fill-current`} fillOpacity="0.12" />
              <path d={geo.line} className={`${tone} stroke-current`} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {scrub != null && (
                <g>
                  <line x1={geo.x(scrub)} x2={geo.x(scrub)} y1={PAD_TOP} y2={H - PAD_BOTTOM} className="stroke-zinc-300" strokeWidth="1" />
                  <circle cx={geo.x(scrub)} cy={geo.y(geo.pts[scrub].c)} r="4" className={`${tone} fill-current`} />
                </g>
              )}
            </svg>
            <div className="flex flex-wrap items-center justify-between gap-x-3 text-[11px] font-mono text-zinc-400">
              <span>
                High {data?.high != null ? price(data.high) : '–'} · Low {data?.low != null ? price(data.low) : '–'}
              </span>
              {baseline != null && <span>- - previous close {price(baseline)}</span>}
            </div>
            {data?.note && <p className="text-[11px] text-zinc-500">{data.note}</p>}
          </>
        ) : (
          !isLoading && <p className="text-xs text-zinc-400">{data?.note ?? 'Chart not available for this stock.'}</p>
        )}
      </div>
    </section>
  )
}
