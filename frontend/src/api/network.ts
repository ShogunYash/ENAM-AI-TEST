/**
 * Network data layer: live API first, committed snapshot as fallback (same pattern as the rest of the app).
 * UI components import ONLY from here. The demo network is SYNTHETIC (NetworkPerson.synthetic === true).
 *
 *   useNetworkInsights()  -> Map<filing id, NetworkInsight>   (management_change and material_event matches)
 *   useCompanyNetwork(sym)-> NetworkInsight | null            ("who to call about this company")
 *   useWarmNudges()       -> WarmNudge[]                      (reconnect reasons)
 *   useExpertise()        -> ExpertiseTheme[]                 (go-to people per theme)
 *   useNetworkPeople()    -> NetworkPerson[]
 *   askNetwork(question)  -> live only; resolves { offline: true } when the API cannot be reached
 */
import { useQuery } from '@tanstack/react-query'
import { API_BASE, fetchWithTimeout } from './client'
import type {
  ExpertiseTheme,
  NetworkAskResponse,
  NetworkInsight,
  NetworkPerson,
  WarmNudge,
} from './types'

async function getJson<T>(livePath: string, snapshotPath: string): Promise<T> {
  try {
    const live = await fetchWithTimeout(`${API_BASE}${livePath}`, {}, 2500)
    if (live.ok) return (await live.json()) as T
  } catch {
    // API asleep or unreachable: use the snapshot
  }
  const snap = await fetch(snapshotPath)
  if (!snap.ok) throw new Error(`network snapshot missing: ${snapshotPath}`)
  return (await snap.json()) as T
}

const STALE = 60_000

export function useNetworkInsights() {
  return useQuery({
    queryKey: ['network', 'insights'],
    queryFn: () => getJson<NetworkInsight[]>('/network/insights', '/data/network/insights.json'),
    staleTime: STALE,
    select: (rows) => new Map(rows.map((r) => [r.key, r] as const)),
  })
}

export function useCompanyNetwork(symbol?: string | null) {
  return useQuery({
    queryKey: ['network', 'company', symbol],
    enabled: Boolean(symbol),
    queryFn: () =>
      getJson<NetworkInsight>(`/network/company/${symbol}`, `/data/network/companies/${symbol}.json`),
    staleTime: STALE,
    retry: false,
  })
}

export function useWarmNudges() {
  return useQuery({
    queryKey: ['network', 'warm'],
    queryFn: () => getJson<WarmNudge[]>('/network/warm', '/data/network/warm.json'),
    staleTime: STALE,
  })
}

export function useExpertise() {
  return useQuery({
    queryKey: ['network', 'expertise'],
    queryFn: () => getJson<ExpertiseTheme[]>('/network/expertise', '/data/network/expertise.json'),
    staleTime: STALE,
  })
}

export function useNetworkPeople() {
  return useQuery({
    queryKey: ['network', 'people'],
    queryFn: () => getJson<NetworkPerson[]>('/network/people', '/data/network/people.json'),
    staleTime: STALE,
  })
}

export type AskNetworkResult = NetworkAskResponse | { offline: true }

export async function askNetwork(question: string): Promise<AskNetworkResult> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/network/ask`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      },
      30_000,
    )
    if (res.ok) return (await res.json()) as NetworkAskResponse
  } catch {
    // fall through
  }
  return { offline: true }
}

export const SYNTHETIC_NOTE = 'Synthetic demo network'
