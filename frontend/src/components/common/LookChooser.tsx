import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { applyTheme, type ThemeMode } from '@/lib/theme'

type Look = Exclude<ThemeMode, 'auto'>
const looks: { id: Look; name: string; page: string; panel: string; text: string; label: string; gain: string; line: string }[] = [
  { id: 'light', name: 'Light', page: '#F4F6FB', panel: '#FFFFFF', text: '#121C2E', label: '#37465C', gain: '#0B7140', line: '#D6DDEB' },
  { id: 'dark', name: 'Dark', page: '#09090B', panel: '#18181B', text: '#F4F4F5', label: '#D4D4D8', gain: '#62D99D', line: '#52525B' },
  { id: 'terminal', name: 'Terminal', page: '#050505', panel: '#101010', text: '#F5F5F5', label: '#FFC768', gain: '#00D26A', line: '#424242' },
]

export function needsLookChoice() {
  if (new URLSearchParams(window.location.search).has('nosplash')) return false
  try { return localStorage.getItem('finn.onboarded') === null && localStorage.getItem('finn.theme') === null }
  catch { return true }
}

export function LookChooser({ onContinue }: { onContinue: () => void }) {
  const [selected, setSelected] = useState<Look>('light')
  const dialog = useRef<HTMLDivElement>(null)
  const radios = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => { radios.current[0]?.focus() }, [])
  const choose = (index: number) => {
    const look = looks[index]
    setSelected(look.id)
    applyTheme(look.id)
    radios.current[index]?.focus()
  }
  const radioKey = (event: KeyboardEvent, index: number) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
    const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
    if (forward || backward || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      choose(event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (forward ? 1 : 2)) % 3)
    }
  }
  const trapFocus = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation() }
    if (event.key !== 'Tab') return
    const targets = dialog.current?.querySelectorAll<HTMLButtonElement>('button[tabindex="0"], button:not([role="radio"])')
    if (!targets?.length) return
    const first = targets[0], last = targets[targets.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  const finish = () => {
    try { localStorage.setItem('finn.theme', selected); localStorage.setItem('finn.onboarded', '1') } catch {}
    applyTheme(selected)
    onContinue()
  }
  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="look-title" aria-describedby="look-help" onKeyDown={trapFocus}
      className="fixed inset-0 z-[90] overflow-y-auto bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto flex min-h-full w-full max-w-[398px] flex-col justify-center gap-6">
        <header><p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">FINN · Triage desk</p>
          <h1 id="look-title" className="text-xl font-semibold">Choose your look</h1>
          <p id="look-help" className="mt-2 text-sm text-zinc-400">You can change this later in Settings &gt; Appearance.</p>
        </header>
        <div role="radiogroup" aria-label="Appearance" className="space-y-2">
          {looks.map((look, index) => <button key={look.id} ref={node => { radios.current[index] = node }} type="button" role="radio"
            aria-checked={selected === look.id} tabIndex={selected === look.id ? 0 : -1} onClick={() => choose(index)} onKeyDown={event => radioKey(event, index)}
            className={`w-full rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${selected === look.id ? 'border-brand-text bg-brand-tint' : 'border-zinc-500 bg-zinc-900'}`}>
            <span className="mb-2 flex items-center justify-between text-sm font-semibold"><span>{look.name}</span><span className="text-xs text-zinc-400">{selected === look.id ? 'Selected' : 'Select'}</span></span>
            <span aria-hidden="true" className="block rounded p-2" style={{ background: look.page }}>
              <span className="block rounded border px-3 py-2" style={{ background: look.panel, borderColor: look.line, color: look.text }}>
                <span className="block border-b pb-1 font-mono text-[11px] uppercase tracking-wide" style={{ color: look.label, borderColor: look.line }}>TOD · Portfolio</span>
                <span className="mt-1 flex justify-between font-mono text-sm tabular-nums"><span>1,234.5</span><span style={{ color: look.gain }}>▲+1.2%</span></span>
              </span>
            </span>
          </button>)}
        </div>
        <button type="button" onClick={finish} className="min-h-[44px] w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Continue</button>
      </div>
    </div>
  )
}
