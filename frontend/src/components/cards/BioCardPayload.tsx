import React from 'react'
import { BioCard } from '@/api/types'
import { ExternalLink } from 'lucide-react'

interface BioCardPayloadProps {
  enrichment: BioCard
}

export const BioCardPayload: React.FC<BioCardPayloadProps> = ({ enrichment }) => {
  const { background, links } = enrichment

  if (!background || background.length === 0) {
    return null
  }

  // Keep one career fact below (do not repeat name and role in two places)
  const careerFact = background[0]

  return (
    <div className="mt-2 p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40 space-y-1.5">
      <p className="text-xs text-zinc-300 leading-snug">
        {careerFact}
      </p>

      {links && links.length > 0 && (
        <div className="pt-0.5 flex items-center gap-2 text-[11px]">
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
