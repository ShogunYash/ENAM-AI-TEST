import { useState, type ReactNode } from 'react'

export function PanelHeader({ title, count, helper, code, id }: {
  title: string; count?: ReactNode; helper?: string; code: string; id?: string
}) {
  return (
    <div className="desk-panel-header">
      <h2 id={id} className="desk-panel-label">
        <span className="desk-panel-code" aria-hidden="true">{code}</span>
        {title}
      </h2>
      {count !== undefined && <span className="desk-count">{count}</span>}
      {helper && <span className="desk-panel-helper">{helper}</span>}
    </div>
  )
}

const failedLogos = new Set<string>()

export function IdentityMark({ name, kind = 'person', symbol }: {
  name: string; kind?: 'person' | 'company'; symbol?: string
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const normalized = symbol?.trim().toUpperCase()
  const showLogo = kind === 'company' && normalized && failed !== normalized && !failedLogos.has(normalized)
  return <span aria-hidden="true" data-company-symbol={kind === 'company' ? normalized : undefined}
    className={`desk-identity ${kind === 'person' ? 'desk-identity-person' : 'desk-identity-company'}`}>
    {showLogo ? <img src={`/logos/${encodeURIComponent(normalized)}.png`} alt="" aria-hidden="true" loading="lazy" decoding="async"
      className="h-full w-full object-contain" onError={() => { failedLogos.add(normalized); setFailed(normalized) }} />
      : name.split(' ').map(word => word[0]).slice(0, 2).join('')}
  </span>
}
