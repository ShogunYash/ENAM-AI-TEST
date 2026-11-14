/**
 * FINN Formatting Utilities
 * Adheres strictly to FINN UI principles and CONTRACT.md:
 * - Money: ₹ crore with Indian grouping (`₹1,23,456 Cr`).
 * - Percent: signed with one decimal (`+12.4%`, `−3.1%`) using true minus sign (U+2212).
 * - Colour & symbols: green/red plus ▲/▼ arrows. Neutral grey for flat (|Δ| < 0.5%).
 * - Numbers: right-aligned with tabular figures.
 * - Time: relative within 24h ("3h ago"), otherwise date like "10 Nov" in IST.
 */

export function formatInrCr(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  
  // Check if integer
  const hasDecimals = decimals > 0 && Math.abs(val % 1) > 0.001
  const formattedNum = val.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? decimals : 0,
    maximumFractionDigits: decimals,
  })
  
  return `₹${formattedNum} Cr`
}

export interface FormattedDelta {
  text: string
  arrow: '▲' | '▼' | '—' | ''
  colorClass: string
  isFlat: boolean
}

export function formatPercentDelta(val: number | null | undefined): FormattedDelta {
  if (val === null || val === undefined || isNaN(val)) {
    return {
      text: '—',
      arrow: '',
      colorClass: 'text-zinc-400',
      isFlat: true,
    }
  }

  const absVal = Math.abs(val)
  const isFlat = absVal < 0.5

  if (isFlat) {
    const sign = val > 0 ? '+' : val < 0 ? '−' : ''
    return {
      text: `${sign}${absVal.toFixed(1)}%`,
      arrow: '—',
      colorClass: 'text-zinc-400',
      isFlat: true,
    }
  }

  if (val > 0) {
    return {
      text: `+${val.toFixed(1)}%`,
      arrow: '▲',
      colorClass: 'text-emerald-400',
      isFlat: false,
    }
  }

  // val < 0: Use true minus sign U+2212
  return {
    text: `−${absVal.toFixed(1)}%`,
    arrow: '▼',
    colorClass: 'text-rose-400',
    isFlat: false,
  }
}

export function formatVolumeMultiple(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return `${val.toFixed(1)}×`
}

export function formatRelativeIst(isoString: string): string {
  if (!isoString) return ''
  
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString

  // The local or reference now
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  // If in the future or under 1 minute
  if (diffMinutes < 1 && diffMinutes >= 0) return 'just now'
  if (diffMinutes > 0 && diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours >= 1 && diffHours < 24) return `${diffHours}h ago`

  // Beyond 24h, format e.g. "10 Nov" in IST
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  })
}

export function formatExactIst(isoString: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

/**
 * Maps raw document IDs like "INFY:concall_Q1FY27" or "KPIL:annual_report_FY26"
 * to analyst-grade labels like "Q1 FY27 earnings call · p.29" or "FY26 annual report · p.188".
 */
export function formatDocSourceLabel(
  docId: string,
  page: number | null,
  sourceDocs: Array<{ doc_id: string; kind?: string; period?: string }> = []
): string {
  const matched = sourceDocs.find((d) => d.doc_id === docId)
  let title = ''

  if (matched) {
    const kind = matched.kind
    const period = matched.period || ''
    if (kind === 'annual_report') {
      title = `${period} annual report`.trim()
    } else if (kind === 'concall') {
      title = `${period} earnings call`.trim()
    } else if (kind === 'presentation') {
      title = `${period} presentation`.trim()
    } else {
      title = period || 'Source filing'
    }
  } else {
    const cleaned = docId.includes(':') ? docId.split(':')[1] : docId
    if (cleaned.toLowerCase().includes('concall')) {
      const qMatch = cleaned.match(/(Q[1-4])_?(FY\d{2})/i) || cleaned.match(/(Q[1-4])(FY\d{2})/i)
      if (qMatch) {
        title = `${qMatch[1].toUpperCase()} ${qMatch[2].toUpperCase()} earnings call`
      } else {
        title = 'Earnings call'
      }
    } else if (cleaned.toLowerCase().includes('annual_report')) {
      const match = cleaned.match(/FY\d{2}/i)
      const yr = match ? match[0].toUpperCase() : 'FY26'
      title = `${yr} annual report`
    } else if (cleaned.toLowerCase().includes('filing')) {
      title = 'Filing'
    } else {
      title = 'Filing'
    }
  }

  if (page !== null && page !== undefined) {
    return `${title} · p.${page}`
  }
  return title
}

/**
 * Formats a verified table actual number, e.g. "Filed: 21.6% (screener.in FY26)"
 */
export function formatActual(
  actual: { value: number | null; unit: string; source: string } | null | undefined,
  horizon?: string | null
): string | null {
  if (!actual || actual.value === null || actual.value === undefined) return null
  const formattedVal = actual.unit === 'pct' ? `${actual.value}%` : `${actual.value} ${actual.unit}`
  const yr = horizon || 'FY26'
  return `Filed: ${formattedVal} (screener.in ${yr})`
}


/** Category id -> reader-facing label: 'm_and_a' -> 'M&A', 'fund_raise' -> 'fund raise'. */
export function formatCategory(category: string): string {
  if (category === 'm_and_a') return 'M&A'
  return category.replace(/_/g, ' ')
}

export function getCategoryBadgeClasses(cat: string): string {
  const c = cat.toLowerCase()
  if (c === 'results') {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60'
  }
  if (c === 'fund_raise') {
    return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60'
  }
  if (c === 'm_and_a' || c === 'm&a') {
    return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-[#D8B4FE] dark:border-purple-800/60'
  }
  if (c === 'management_change' || c === 'management') {
    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
  }
  if (c === 'litigation') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
  }
  if (c === 'insider_trading' || c === 'pledging') {
    return 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60'
  }
  if (c === 'credit_rating') {
    return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60'
  }
  if (c === 'dividend' || c === 'bonus_split') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
  }
  // Routine paperwork
  return 'bg-zinc-800/70 text-zinc-400 border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700/50'
}
