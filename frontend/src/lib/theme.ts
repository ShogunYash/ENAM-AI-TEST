import { useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'terminal' | 'auto'

const THEME_KEY = 'finn.theme'

export function getStoredTheme(): ThemeMode {
  try {
    const val = localStorage.getItem(THEME_KEY)
    if (val === 'light' || val === 'dark' || val === 'terminal' || val === 'auto') {
      return val
    }
  } catch {}
  return 'light' // default is Light (not Auto)
}

export function applyTheme(mode: ThemeMode) {
  try {
    const isDark =
      mode === 'terminal' || mode === 'dark' ||
      (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    document.documentElement.classList.toggle('terminal', mode === 'terminal')

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', mode === 'terminal' ? '#050505' : isDark ? '#09090B' : '#F4F6FB')
    }
  } catch {}
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme)

  const setTheme = (mode: ThemeMode) => {
    try {
      localStorage.setItem(THEME_KEY, mode)
    } catch {}
    setThemeState(mode)
    applyTheme(mode)
    window.dispatchEvent(new Event('finn-theme-change'))
  }

  useEffect(() => {
    const sync = () => setThemeState(getStoredTheme())
    window.addEventListener('finn-theme-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('finn-theme-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    applyTheme(theme)

    if (theme === 'auto') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => applyTheme('auto')
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [theme])

  const isDark =
    theme === 'terminal' || theme === 'dark' ||
    (theme === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  return { theme, setTheme, isDark }
}
