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
