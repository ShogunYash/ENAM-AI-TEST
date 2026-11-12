import React, { useState } from 'react'
import { Filing } from '@/api/types'
import { formatPercentDelta, formatVolumeMultiple, formatRelativeIst } from '@/lib/formatters'
import { ResultsCardPayload } from './ResultsCardPayload'
import { BioCardPayload } from './BioCardPayload'
import { OneLinerPayload } from './OneLinerPayload'
import { ExternalLink, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

interface FilingCardProps {
  filing: Filing
  onAskFinn?: (filing: Filing) => void
  highlight?: boolean
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

  const priorityColor =
    priority === 'high'
      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
      : priority === 'medium'
      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
      : 'bg-zinc-500'

  return (
    <article
      id={`filing-${id}`}
      className={`rounded-xl border bg-zinc-900/80 p-3.5 transition-all ${
        highlight
          ? 'border-zinc-500 ring-1 ring-zinc-500 bg-zinc-900'
          : 'border-zinc-800/90 hover:border-zinc-700/80'
      }`}
    >
      {/* Top row: [Company · Category chip · Time ago]   [Priority dot · Score] */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono font-bold text-zinc-100 tracking-tight">{symbol}</span>
          <span className="text-zinc-600">·</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-800/90 text-[10px] font-medium text-zinc-300 border border-zinc-700/50">
            {category.replace(/_/g, ' ')}
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
          <span className={`w-2 h-2 rounded-full ${priorityColor}`} />
        </div>
      </div>

      {/* Headline rewritten as "So what" (≤ 70 chars) */}
      <div className="space-y-1">
        <h3 className="text-[14px] font-semibold text-zinc-100 leading-snug">
          {so_what || headline}
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
      {enrichment && enrichment.type === 'oneliner' && (
        <OneLinerPayload enrichment={enrichment} />
      )}

      {/* Card Action Bar: [Source PDF ↗]  [Ask FINN] */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
        {pdf_url ? (
          <a
            href={pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 font-medium transition-colors py-1.5 px-2 -ml-2 rounded-lg touch-manipulation"
          >
            <span>Source PDF</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-zinc-600 text-[11px]">No PDF attached</span>
        )}

        <button
          onClick={() => onAskFinn && onAskFinn(filing)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 text-xs font-medium border border-zinc-700/60 touch-manipulation transition-colors"
        >
          <MessageSquare className="w-3 h-3 text-zinc-400" />
          <span>Ask FINN</span>
        </button>
      </div>
    </article>
  )
}
