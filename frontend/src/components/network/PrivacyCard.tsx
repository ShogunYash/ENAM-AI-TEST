import { SYNTHETIC_NOTE } from '@/api/network'

export function PrivacyCard() {
  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-3.5 text-xs">
      <h2 className="font-semibold text-zinc-100">Your network is private to you</h2>
      <ul className="mt-2 space-y-1.5 text-zinc-300">
        <li>Stored separately for each investor.</li>
        <li>Never used to train models.</li>
        <li>You can delete your network.</li>
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">{SYNTHETIC_NOTE}. This demo uses shared fictional contacts. Investor accounts and deletion controls are planned.</p>
    </section>
  )
}
