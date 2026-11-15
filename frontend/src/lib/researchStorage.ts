import { useEffect, useState } from 'react'
import type { Research } from '@/api/types'

const PREFIX = 'finn.research.v1.'
const CHANGED = 'finn-research-changed'
const MAX_REPORTS = 12
// Conservative UTF-16 estimate includes keys and serialized values.
const MAX_BYTES = 1_500_000
export interface SavedResearch { savedAt: string; data: Research }

function parseSaved(raw: string | null): SavedResearch | undefined {
  if (!raw) return
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || !('savedAt' in value) || typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt)) || !('data' in value)) return
    const data = value.data
    if (!data || typeof data !== 'object' || !('symbol' in data) || typeof data.symbol !== 'string' || !('status' in data) || !['ready', 'partial'].includes(String(data.status)) || !('is_sample' in data) || data.is_sample !== false) return
    if (!('pvd' in data) || !Array.isArray(data.pvd) || !('sources' in data) || !Array.isArray(data.sources) || !('progress' in data) || !Array.isArray(data.progress) || !('gaps' in data) || !Array.isArray(data.gaps) || !('snapshot' in data) || !('cost' in data)) return
    return value as SavedResearch
  } catch { return }
}

function entries() {
  return Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).map(key => {
    const raw = localStorage.getItem(key) || ''
    const parsed = parseSaved(raw)
    return { key, raw, parsed, time: parsed ? Date.parse(parsed.savedAt) : 0, bytes: 2 * (key.length + raw.length) }
  }).sort((a, b) => a.time - b.time || a.key.localeCompare(b.key))
}

export function readSavedResearch(symbol: string): SavedResearch | undefined {
  try {
    const saved = parseSaved(localStorage.getItem(PREFIX + symbol.trim().toUpperCase()))
    return saved?.data.symbol === symbol.trim().toUpperCase() ? saved : undefined
  } catch { return }
}

export function listSavedResearch(): SavedResearch[] {
  try {
    return entries().filter(entry => entry.parsed && entry.key === PREFIX + entry.parsed.data.symbol)
      .map(entry => entry.parsed!).sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
  } catch { return [] }
}

export function saveResearchReport(data: Research) {
  if (!['ready', 'partial'].includes(data.status) || data.is_sample !== false) return
  try {
    const key = PREFIX + data.symbol.trim().toUpperCase()
    const value = JSON.stringify({ savedAt: new Date().toISOString(), data })
    const bytes = 2 * (key.length + value.length)
    if (bytes > MAX_BYTES) return
    const older = entries().filter(entry => entry.key !== key)
    let total = older.reduce((sum, entry) => sum + entry.bytes, 0)
    while (older.length >= MAX_REPORTS || total + bytes > MAX_BYTES) {
      const oldest = older.shift()
      if (!oldest) break
      localStorage.removeItem(oldest.key); total -= oldest.bytes
    }
    try { localStorage.setItem(key, value) }
    catch {
      const oldest = older.shift()
      if (oldest) localStorage.removeItem(oldest.key)
      localStorage.setItem(key, value) // one quota retry; outer catch is deliberately silent
    }
    window.dispatchEvent(new Event(CHANGED))
  } catch { window.dispatchEvent(new Event(CHANGED)) }
}

export function removeSavedResearch(symbol: string) {
  try { localStorage.removeItem(PREFIX + symbol.trim().toUpperCase()) } catch {}
  window.dispatchEvent(new Event(CHANGED))
}

export function useSavedResearch() {
  const [reports, setReports] = useState(listSavedResearch)
  useEffect(() => {
    const sync = () => setReports(listSavedResearch())
    window.addEventListener(CHANGED, sync)
    window.addEventListener('storage', sync)
    sync()
    return () => { window.removeEventListener(CHANGED, sync); window.removeEventListener('storage', sync) }
  }, [])
  return reports
}
