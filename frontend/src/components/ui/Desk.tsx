import type { ReactNode } from 'react'

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

export function IdentityMark({ name, kind = 'person' }: { name: string; kind?: 'person' | 'company' }) {
  return <span aria-hidden="true" className={`desk-identity ${kind === 'person' ? 'desk-identity-person' : 'desk-identity-company'}`}>
    {name.split(' ').map(word => word[0]).slice(0, 2).join('')}
  </span>
}
