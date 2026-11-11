import React from 'react'
import { OneLiner } from '@/api/types'

interface OneLinerPayloadProps {
  enrichment: OneLiner
}

export const OneLinerPayload: React.FC<OneLinerPayloadProps> = ({ enrichment }) => {
  if (!enrichment.text) return null

  return (
    <div className="mt-2 text-xs text-zinc-300 leading-relaxed bg-zinc-900/40 p-2 rounded border border-zinc-800/60">
      {enrichment.text}
    </div>
  )
}
