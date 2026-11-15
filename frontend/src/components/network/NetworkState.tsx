import type { ReactNode } from 'react'

export function NetworkState({ children, loading = false }: { children: ReactNode; loading?: boolean }) {
  return (
    <p role="status" className="flex min-h-5 items-center gap-2 py-2 text-xs leading-5 text-zinc-400">
      {loading && <span aria-hidden="true" className="h-3 w-8 shrink-0 rounded bg-zinc-800" />}
      <span>{children}</span>
    </p>
  )
}
