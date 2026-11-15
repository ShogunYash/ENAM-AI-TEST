import React, { useEffect, useState } from 'react'

const HOLD_MS = 1900
const FADE_MS = 450

/**
 * Opening animation, shown on every fresh load of the app: the FINN wordmark builds letter by letter while a
 * rising price line draws itself. Visual only (pointer-events: none), so it can never block a tap or a test, and it
 * is skipped with ?nosplash and shortened for people who prefer reduced motion.
 */
export const Splash: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const skip =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nosplash')
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [phase, setPhase] = useState<'show' | 'leave' | 'gone'>(skip ? 'gone' : 'show')

  useEffect(() => {
    if (skip) return
    const t1 = window.setTimeout(() => setPhase('leave'), reduced ? 500 : HOLD_MS)
    const t2 = window.setTimeout(() => setPhase('gone'), (reduced ? 500 : HOLD_MS) + FADE_MS)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [skip, reduced])

  useEffect(() => { if (phase === 'gone') onComplete?.() }, [phase, onComplete])

  if (phase === 'gone') return null

  return (
    <div
      aria-hidden="true"
      className={`finn-splash fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 pointer-events-none ${
        phase === 'leave' ? 'finn-splash-out' : ''
      }`}
    >
      <div className="finn-splash-glow absolute inset-0" />
      <div className="relative flex flex-col items-center">
        <div className="flex font-mono font-black text-6xl tracking-[0.18em] text-brand-text">
          {'FINN'.split('').map((ch, i) => (
            <span key={i} className="finn-letter" style={{ animationDelay: `${150 + i * 110}ms` }}>
              {ch}
            </span>
          ))}
        </div>

        <svg viewBox="0 0 170 44" className="w-44 h-12 mt-3 overflow-visible">
          <path
            d="M3 36 L28 29 L50 33 L76 21 L100 25 L128 11 L164 5"
            pathLength={1}
            fill="none"
            stroke="rgb(var(--brand-primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="finn-line"
          />
          <circle cx="164" cy="5" r="4.5" fill="rgb(var(--brand-primary))" className="finn-dot" />
        </svg>

        <p className="finn-tagline mt-4 text-sm font-semibold text-zinc-200">A triage desk for your portfolio</p>
        <p className="finn-tagline-2 mt-1 text-[11px] font-mono tracking-wider text-zinc-500 uppercase">
          Built for the ENAM AI Build Challenge
        </p>
      </div>
    </div>
  )
}
