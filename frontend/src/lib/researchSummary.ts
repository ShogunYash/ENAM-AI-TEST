import type { PvDItem } from '@/api/types'

export function verdictSummary(items: PvDItem[]) {
  const counts: Record<string, number> = {}
  for (const item of items) { const verdict = item.verdict || 'pending'; counts[verdict] = (counts[verdict] || 0) + 1 }
  const priority = ['missed', 'cut', 'raised', 'pending', 'met']
  return [...priority, ...Object.keys(counts).filter(key => !priority.includes(key))]
    .filter(key => counts[key]).map(key => `${counts[key]} ${key}`).join(' · ')
}
