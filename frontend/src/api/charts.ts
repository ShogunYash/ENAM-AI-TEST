/** Price chart data: live API first, committed snapshot as fallback (same pattern as the rest of the app). */
import { useQuery } from '@tanstack/react-query'
import { API_BASE, fetchWithTimeout } from './client'
import type { components } from './schema'

export type PriceChartData = components['schemas']['PriceChart']
export type ChartRange = PriceChartData['range']
export const CHART_RANGES: ChartRange[] = ['1d', '3d', '7d', '30d']

async function getChart(symbol: string, range: ChartRange): Promise<PriceChartData | null> {
  try {
    const live = await fetchWithTimeout(`${API_BASE}/prices/${symbol}/chart?range=${range}`, {}, 2500)
    if (live.ok) return (await live.json()) as PriceChartData
    if (live.status === 404) return null // not a tracked symbol: nothing to chart
  } catch {
    // API asleep or unreachable: use the snapshot
  }
  const snap = await fetch(`/data/charts/${symbol}-${range}.json`)
  return snap.ok ? ((await snap.json()) as PriceChartData) : null
}

export function usePriceChart(symbol: string, range: ChartRange) {
  return useQuery({
    queryKey: ['chart', symbol, range],
    queryFn: () => getChart(symbol, range),
    staleTime: 5 * 60_000,
    retry: false,
  })
}
