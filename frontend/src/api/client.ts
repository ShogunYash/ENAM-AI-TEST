import {
  Digest,
  DigestWindow,
  Filing,
  PriceSnapshot,
  SnapshotMeta,
  Settings,
  Alert,
  Research,
  LlmStats,
  PortfolioStock,
  AskRequest,
  AskResponse,
} from './types'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8000').trim()

export interface DigestResult {
  digest: Digest
  source: 'live' | 'snapshot'
  asOf: string
  isReachable: boolean
  isLive: boolean
}

export interface ResearchResult {
  data: Research
  source: 'live' | 'snapshot'
}

export interface StatsResult {
  data: LlmStats
  source: 'live' | 'snapshot'
  isLive: boolean
  provenance: 'live' | 'snapshot' | 'mock'
}

// Timeout fetch helper to ensure fast fallback if backend is offline
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

export async function fetchHealth(): Promise<{ mode: 'live' | 'mock'; as_of: string | null } | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 2000)
    if (res.ok) {
      const data = await res.json()
      return {
        mode: data.mode === 'live' ? 'live' : 'mock',
        as_of: data.snapshot_as_of ?? null,
      }
    }
  } catch {}
  return null
}

export async function fetchSnapshotMeta(): Promise<SnapshotMeta> {
  const res = await fetch('/data/meta.json')
  if (!res.ok) {
    throw new Error('Failed to load snapshot meta')
  }
  return res.json()
}

export async function fetchSnapshotPrices(): Promise<PriceSnapshot[]> {
  const res = await fetch('/data/prices.json')
  if (!res.ok) {
    throw new Error('Failed to load prices snapshot')
  }
  return res.json()
}

export async function fetchSnapshotDigest(windowLabel: string): Promise<Digest> {
  // If label is custom or file doesn't exist, fallback to 24h
  const fileKey = windowLabel === '30d' ? '30d' : windowLabel === '3d' ? '3d' : windowLabel === '7d' ? '7d' : '24h'
  const res = await fetch(`/data/digest-${fileKey}.json`)
  if (!res.ok) {
    // try 24h fallback
    const fb = await fetch('/data/digest-24h.json')
    if (!fb.ok) throw new Error('Failed to load snapshot digest')
    return fb.json()
  }
  return res.json()
}

export async function fetchFilingDetail(id: string): Promise<Filing | null> {
  // 1. Try live API
  try {
    const liveRes = await fetchWithTimeout(`${API_BASE}/filings/${id}`, {}, 2000)
    if (liveRes.ok) {
      return liveRes.json()
    }
  } catch {}

  // 2. Try snapshot file
  try {
    const snapRes = await fetch(`/data/filings/${id}.json`)
    if (snapRes.ok) {
      return snapRes.json()
    }
  } catch {}

  return null
}

export async function fetchResearchData(symbol: string): Promise<ResearchResult> {
  const sym = symbol.toUpperCase().trim()

  // 1. Try live API
  try {
    const liveRes = await fetchWithTimeout(`${API_BASE}/research/${sym}`, {}, 2000)
    if (liveRes.ok) {
      const data = await liveRes.json()
      return { data, source: 'live' }
    }
  } catch (err) {
    // Live API unreachable, fall back to snapshot
  }

  // 2. Try snapshot file
  try {
    const snapRes = await fetch(`/data/research/${sym}.json`)
    if (snapRes.ok) {
      const data = await snapRes.json()
      return { data, source: 'snapshot' }
    }
  } catch {}

  // 3. Fallback building state
  try {
    const buildRes = await fetch('/data/research/building.json')
    if (buildRes.ok) {
      const buildData = await buildRes.json()
      return {
        data: {
          ...buildData,
          symbol: sym,
        },
        source: 'snapshot',
      }
    }
  } catch {}

  return {
    data: {
      symbol: sym,
      name: null,
      status: 'building',
      is_sample: true,
      progress: [
        'Resolving symbol',
        'Loaded financial tables',
        'Found 4 concall transcripts',
        'Extracting guidance 2/4…',
      ],
      generated_at: null,
      sources: [],
      snapshot: null,
      pvd: [],
      extra: null,
      gaps: ['Annual report not yet published'],
      cost: { llm_calls: 2, cached: false },
    },
    source: 'snapshot',
  }
}

export async function fetchLlmStats(): Promise<StatsResult> {
  let healthMode: 'live' | 'mock' | null = null
  try {
    const health = await fetchHealth()
    if (health) {
      healthMode = health.mode
    }
  } catch {}

  // 1. Try live API
  try {
    const liveRes = await fetchWithTimeout(`${API_BASE}/stats/llm`, {}, 2000)
    if (liveRes.ok) {
      const data = await liveRes.json()
      const isLive = healthMode === 'live'
      const provenance: 'live' | 'snapshot' | 'mock' = healthMode === 'mock' ? 'mock' : 'live'
      return { data, source: 'live', isLive, provenance }
    }
  } catch (err) {
    // Live API unreachable, fallback
  }

  // 2. Fallback to snapshot file
  const snapRes = await fetch('/data/stats.json')
  if (!snapRes.ok) {
    throw new Error('Failed to load stats snapshot')
  }
  const data = await snapRes.json()
  return { data, source: 'snapshot', isLive: false, provenance: 'snapshot' }
}

export async function fetchPortfolio(): Promise<PortfolioStock[]> {
  try {
    const res = await fetch('/data/portfolio.json')
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.portfolio)) {
        return json.portfolio
      }
    }
  } catch {}

  // Fallback to companies.json
  try {
    const res = await fetch('/data/companies.json')
    if (res.ok) {
      const companies = await res.json()
      return companies.map((c: any) => ({
        nse_symbol: c.symbol,
        bse_scrip_code: c.bse_code,
        name: c.name,
        sector: c.sector,
      }))
    }
  } catch {}

  return [
    { nse_symbol: 'INFY', name: 'Infosys' },
    { nse_symbol: 'TCS', name: 'Tata Consultancy Services' },
    { nse_symbol: 'BAJFINANCE', name: 'Bajaj Finance' },
    { nse_symbol: 'TITAN', name: 'Titan Company' },
  ]
}

/**
 * Recomputes price and volume alerts from prices.json according to user's custom thresholds
 * (Contract rule: deliberate logic duplication between backend and frontend for offline mode)
 */
export function recomputeOfflineAlerts(
  prices: PriceSnapshot[],
  settings: Settings,
  baseAlerts: Alert[] = []
): Alert[] {
  const generatedAlerts: Alert[] = []

  for (const p of prices) {
    // Check volume spike
    if (p.vol_ratio !== null && p.vol_ratio >= settings.volume_multiple) {
      generatedAlerts.push({
        id: `offline-vol-${p.symbol}`,
        symbol: p.symbol,
        kind: 'volume_spike',
        triggered_at: p.as_of,
        value: p.vol_ratio,
        threshold: settings.volume_multiple,
        message: `Volume ${p.vol_ratio.toFixed(1)}× ${settings.volume_lookback_days}d avg`,
        filing_id: null,
      })
    }

    // Check price move
    if (p.pct_1d !== null && Math.abs(p.pct_1d) >= settings.price_move_pct) {
      const sign = p.pct_1d > 0 ? '+' : '−'
      generatedAlerts.push({
        id: `offline-price-${p.symbol}`,
        symbol: p.symbol,
        kind: 'price_move',
        triggered_at: p.as_of,
        value: p.pct_1d,
        threshold: settings.price_move_pct,
        message: `${sign}${Math.abs(p.pct_1d).toFixed(1)}% today`,
        filing_id: null,
      })
    }
  }

  // Preserve any material_filing alerts from the base digest
  const materialFilingAlerts = baseAlerts.filter((a) => a.kind === 'material_filing')

  // Combine and sort by highest threshold/intensity
  return [...generatedAlerts, ...materialFilingAlerts]
}

/**
 * Primary Data Layer:
 * 1. Loads snapshot instantly
 * 2. Tries to refresh from VITE_API_BASE if reachable
 * 3. Applies offline alert recomputation if running off snapshot
 */
export async function getDigestData(
  windowLabel: '24h' | '3d' | '7d' | '30d' | 'custom',
  settings: Settings
): Promise<DigestResult> {
  // Always load snapshot first for instantaneous display
  let snapshotDigest: Digest
  try {
    snapshotDigest = await fetchSnapshotDigest(windowLabel)
  } catch (err) {
    console.warn('Could not load snapshot digest, trying 24h fallback', err)
    snapshotDigest = await fetchSnapshotDigest('24h')
  }

  let prices: PriceSnapshot[] = []
  try {
    prices = await fetchSnapshotPrices()
  } catch (err) {
    console.warn('Could not load snapshot prices', err)
  }

  // Check if live API is reachable and in live mode
  let liveDigest: Digest | null = null
  let isReachable = false
  let isLive = false

  try {
    const health = await fetchHealth()
    if (health?.mode === 'live') {
      isLive = true
    }

    const params = new URLSearchParams({
      window: windowLabel,
      volume_multiple: settings.volume_multiple.toString(),
      price_move_pct: settings.price_move_pct.toString(),
    })
    if (settings.categories_of_interest.length > 0) {
      params.append('interests', settings.categories_of_interest.join(','))
    }
    if (settings.muted_categories.length > 0) {
      params.append('muted', settings.muted_categories.join(','))
    }

    const response = await fetchWithTimeout(`${API_BASE}/digest?${params.toString()}`, {}, 3000)
    if (response.ok) {
      liveDigest = await response.json()
      isReachable = true
    }
  } catch (err) {
    // Backend offline / unreachable, fallback cleanly to snapshot
    isReachable = false
    isLive = false
  }

  if (liveDigest && isReachable) {
    return {
      digest: liveDigest,
      source: 'live',
      asOf: liveDigest.generated_at,
      isReachable: true,
      isLive,
    }
  }

  // Offline / Snapshot mode:
  // Recompute alerts if prices are available and thresholds differ
  const adjustedAlerts = prices.length > 0
    ? recomputeOfflineAlerts(prices, settings, snapshotDigest.alerts)
    : snapshotDigest.alerts

  const finalDigest: Digest = {
    ...snapshotDigest,
    alerts: adjustedAlerts,
  }

  return {
    digest: finalDigest,
    source: 'snapshot',
    asOf: snapshotDigest.generated_at,
    isReachable: false,
    isLive: false,
  }
}

/**
 * Sends a grounded Q&A question to POST /ask
 */
export async function sendAskQuestion(req: AskRequest): Promise<AskResponse> {
  const response = await fetchWithTimeout(
    `${API_BASE}/ask`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    },
    15000
  )

  if (!response.ok) {
    let errDetail = 'Request failed'
    try {
      const errJson = await response.json()
      errDetail = errJson.detail || errJson.message || response.statusText
    } catch {}
    throw new Error(`Ask failed (${response.status}): ${errDetail}`)
  }

  return response.json()
}

