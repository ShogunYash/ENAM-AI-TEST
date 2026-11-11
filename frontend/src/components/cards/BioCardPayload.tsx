import React from 'react'
import { BioCard } from '@/api/types'
import { User, ExternalLink } from 'lucide-react'

interface BioCardPayloadProps {
  enrichment: BioCard
}

export const BioCardPayload: React.FC<BioCardPayloadProps> = ({ enrichment }) => {
  const { person, role, change, background, links } = enrichment

  const changeBadgeColor =
    change === 'appointed'
      ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
      : change === 'resigned'
      ? 'text-rose-400 bg-rose-950/40 border-rose-800/60'
      : 'text-zinc-400 bg-zinc-800/60 border-zinc-700/60'

  return (
    <div className="mt-2.5 p-2.5 rounded-md border border-zinc-800/90 bg-zinc-900/50 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-100">{person}</div>
            <div className="text-[11px] text-zinc-400">{role}</div>
          </div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${changeBadgeColor}`}
        >
          {change}
        </span>
      </div>

      {background && background.length > 0 && (
        <ul className="text-xs text-zinc-300 space-y-1 pl-3.5 list-disc marker:text-zinc-500">
          {background.slice(0, 3).map((line, idx) => (
            <li key={idx} className="leading-tight">
              {line}
            </li>
          ))}
        </ul>
      )}

      {links && links.length > 0 && (
        <div className="pt-1 flex items-center gap-2 text-[11px]">
          <span className="text-zinc-500">Source:</span>
          {links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-zinc-400 hover:text-zinc-200 underline decoration-zinc-700"
            >
              <span>Profile</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
