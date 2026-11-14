import React from 'react'
import { Claim, SourceDoc } from '@/api/types'
import { formatDocSourceLabel } from '@/lib/formatters'
import { X, ExternalLink, ShieldCheck, FileText, Quote } from 'lucide-react'

interface CitationDrawerProps {
  claim: Claim | null
  metricTitle?: string
  sourceDocs?: SourceDoc[]
  onClose: () => void
  isSample?: boolean
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  claim,
  metricTitle,
  sourceDocs = [],
  onClose,
  isSample = false,
}) => {
  if (!claim) return null

  const kindBadgeColor =
    claim.kind === 'guidance'
      ? 'text-sky-400 bg-sky-950/40 border-sky-800/60'
      : claim.kind === 'fact'
      ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
      : 'text-amber-400 bg-amber-950/40 border-amber-800/60'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] bg-zinc-900 border-t border-zinc-800 rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 flex-wrap">
                <span>Verified Source Citation</span>
                {metricTitle && (
                  <span className="text-zinc-400 font-normal">· {metricTitle}</span>
                )}
                {isSample && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold tracking-wider uppercase">
                    SAMPLE DATA
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Primary source grounding · No broker notes
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Close citation drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Claim statement */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
                Claim Statement
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${kindBadgeColor}`}
              >
                {claim.kind}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-zinc-200 text-[13px] font-medium leading-snug">
              {claim.text}
            </div>
          </div>

          {/* Sources list with exact page & quote */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
                Primary Source Grounding ({claim.sources.length})
              </span>
              {claim.verified && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Verified Quote Match
                </span>
              )}
            </div>

            {claim.sources.map((src, i) => {
              const matchedDoc = sourceDocs.find((d) => d.doc_id === src.doc_id)
              const docUrl = matchedDoc?.url

              return (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2"
                >
                  {/* Doc Metadata (mapped from doc_id to period, doc title, and physical page) */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-bold text-zinc-200">
                        {formatDocSourceLabel(src.doc_id, src.page, sourceDocs)}
                      </span>
                    </div>

                    {docUrl && (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 font-medium"
                      >
                        <span>Document PDF</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Verbatim Quote */}
                  <div className="relative pl-3 border-l-2 border-emerald-500/80 py-0.5 text-zinc-300 italic text-[12px] leading-relaxed">
                    <Quote className="w-3 h-3 text-emerald-500/50 absolute -top-1 -left-1 opacity-40 inline" />
                    "{src.quote}"
                  </div>

                  {/* Footnote */}
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Fuzzy-matched against source transcript
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 text-center text-[11px] text-zinc-500">
          Unverified claims are dropped automatically by server-side grounding checks
        </div>
      </div>
    </div>
  )
}

