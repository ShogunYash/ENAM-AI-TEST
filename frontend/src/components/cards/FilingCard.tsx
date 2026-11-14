import React, { useState } from 'react'
import { Filing } from '@/api/types'
import {
  formatPercentDelta,
  formatVolumeMultiple,
  formatRelativeIst,
  formatCategory,
  getCategoryBadgeClasses,
} from '@/lib/formatters'
import { ResultsCardPayload } from './ResultsCardPayload'
import { BioCardPayload } from './BioCardPayload'
import { OneLinerPayload } from './OneLinerPayload'
import { ExternalLink, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

interface FilingCardProps {
  filing: Filing
  onAskFinn?: (filing: Filing) => void
  highlight?: boolean
}

function getManagementHeadline(filing: Filing): string | null {
  if (filing.enrichment?.type !== 'management') return null
  const bio = filing.enrichment
  let text = filing.so_what || `${bio.person} ${bio.change} as ${bio.role}`
  text = text.replace(/Chief Information Security Officer/i, 'CISO')
  text = text.replace(/Managing Director/i, 'MD')
  if (bio.effective && !text.toLowerCase().includes('from')) {
    const parts = bio.effective.split('-')
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = months[parseInt(parts[1], 10) - 1]
      const year = parts[0]
      const currentYear = new Date().getFullYear()
      const dateStr = parseInt(year, 10) > currentYear ? `${day} ${month} ${year}` : `${day} ${month}`
      text = `${text} from ${dateStr}`
    }
  }
  return text
}

export const FilingCard: React.FC<FilingCardProps> = ({
  filing,
  onAskFinn,
  highlight = false,
}) => {
  const [showFullHeadline, setShowFullHeadline] = useState(false)

  const {
    id,
    symbol,
    company_name,
    filed_at,
    headline,
    so_what,
    category,
    priority,
    score,
    pdf_url,
    price_reaction,
    enrichment,
  } = filing

  const managementHeadline = getManagementHeadline(filing)
  const displayHeadline = managementHeadline || so_what || headline

  const priorityDotClasses =
    priority === 'high'
      ? 'w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/40 ring-offset-1 ring-offset-zinc-900 shadow-[0_0_8px_rgba(200,40,58,0.5)] dark:shadow-[0_0_8px_rgba(255,122,134,0.5)]'
      : priority === 'medium'
      ? 'w-2 h-2 rounded-full bg-amber-400 ring-1 ring-amber-500/60 shadow-[0_0_6px_rgba(168,95,0,0.3)]'
      : 'w-1.5 h-1.5 rounded-full bg-zinc-500 border border-zinc-600/80'

  return (
    <article
      id={`filing-${id}`}
      className={`rounded-xl border bg-zinc-900 p-3.5 transition-all shadow-[0_1px_2px_rgba(16,24,40,0.06)] dark:shadow-none ${
        highlight
          ? 'border-brand ring-1 ring-brand'
          : 'border-zinc-700/80 hover:border-zinc-600'
      }`}
    >
      {/* Top row: [Company · Category chip · Time ago]   [Priority dot · Score] */}
      <div className="flex items-center justify-between gap-2 text-xs mb-2">
        <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
          <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 text-stock">
            <span className="font-mono font-bold tracking-tight">{symbol}</span>
            {company_name && company_name.trim().toUpperCase() !== symbol.toUpperCase() && (
              <span className="font-medium break-words">{company_name}</span>
            )}
          </span>
          <span className="text-zinc-600">·</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryBadgeClasses(category)}`}>
            {formatCategory(category)}
          </span>
          <span className="text-zinc-600">·</span>
          <time dateTime={filed_at} className="text-zinc-400 text-[11px]">
            {formatRelativeIst(filed_at)}
          </time>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" title={`Priority: ${priority} (${score.toFixed(1)})`}>
          <span className="text-[11px] font-mono text-zinc-400 font-medium">
            {score.toFixed(1)}
          </span>
          <span className={priorityDotClasses} />
        </div>
      </div>

      {/* Headline rewritten as "So what" (≤ 70 chars) */}
      <div className="space-y-1">
        <h3 className="text-[14px] font-semibold text-zinc-100 leading-snug">
          {displayHeadline}
        </h3>

        {/* Collapsible raw exchange headline if different */}
        {so_what && so_what !== headline && (
          <div>
            {showFullHeadline ? (
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed bg-zinc-950/40 p-1.5 rounded border border-zinc-800/50">
                <span className="text-zinc-500 font-medium mr-1">BSE:</span>
                {headline}
                <button
                  onClick={() => setShowFullHeadline(false)}
                  className="ml-2 text-zinc-400 hover:text-zinc-200 underline"
                >
                  less
                </button>
              </p>
            ) : (
              <button
                onClick={() => setShowFullHeadline(true)}
                className="text-[11px] text-zinc-500 hover:text-zinc-400 flex items-center gap-0.5"
              >
                <span>BSE headline</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Price reaction chip if present */}
      {price_reaction && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {price_reaction.pct_1d !== null && price_reaction.pct_1d !== undefined && (
            (() => {
              const delta = formatPercentDelta(price_reaction.pct_1d)
              return (
                <span className={`inline-flex items-center gap-0.5 font-mono font-medium ${delta.colorClass}`}>
                  <span className="text-[10px]">{delta.arrow}</span>
                  <span>{delta.text}</span>
                </span>
              )
            })()
          )}
          {price_reaction.vol_ratio !== null && price_reaction.vol_ratio !== undefined && (
            <span className="text-zinc-400 font-mono text-[11px]">
              {formatVolumeMultiple(price_reaction.vol_ratio)} vol
            </span>
          )}
        </div>
      )}

      {/* Payload by type */}
      {enrichment && enrichment.type === 'results' && (
        <ResultsCardPayload enrichment={enrichment} />
      )}
      {enrichment && enrichment.type === 'management' && (
        <BioCardPayload enrichment={enrichment} />
      )}
      {/* The one-liner is already the card heading (so_what): repeating it in a box underneath is noise. */}
      {enrichment && enrichment.type === 'oneliner' && enrichment.text !== so_what && (
        <OneLinerPayload enrichment={enrichment} />
      )}

      {/* Card Action Bar: [Source PDF ↗]  [Ask FINN] */}
      {(() => {
        const resolvedPdfUrl =
          enrichment?.type === 'results' && enrichment.source?.doc_url
            ? enrichment.source.doc_url
            : pdf_url
        const sourcePage =
          enrichment?.type === 'results' ? enrichment.source?.page : undefined

        return (
          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
            {resolvedPdfUrl ? (
              <a
                href={resolvedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 font-medium transition-colors py-1.5 px-2 -ml-2 rounded-lg touch-manipulation"
              >
                <span>
                  {sourcePage ? `Source PDF · p.${sourcePage}` : 'Source PDF'}
                </span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-zinc-600 text-[11px]">No PDF attached</span>
            )}

            <button
              onClick={() => onAskFinn && onAskFinn(filing)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-sm touch-manipulation transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-white/90" />
              <span>Ask FINN</span>
            </button>
          </div>
        )
      })()}
    </article>
  )
}
