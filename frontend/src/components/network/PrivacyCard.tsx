import { SYNTHETIC_NOTE } from '@/api/network'

export function PrivacyCard() {
  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs">
      <details>
        <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-zinc-100 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">Your network is private to you</summary>
      <ul className="mt-2 space-y-2 text-zinc-300">
        <li>Stored separately for each investor.</li>
        <li>Never used to train models.</li>
        <li>You can delete your network.</li>
      </ul>
      </details>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">{SYNTHETIC_NOTE}. This demo uses shared fictional contacts. Investor accounts and deletion controls are planned.</p>
    </section>
  )
}
