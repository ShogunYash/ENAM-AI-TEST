import { useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'

const THEME_KEY = 'finn.theme'

export function getStoredTheme(): ThemeMode {
  try {
    const val = localStorage.getItem(THEME_KEY)
    if (val === 'light' || val === 'dark' || val === 'auto') {
      return val
    }
  } catch {}
  return 'light' // default is Light (not Auto)
}

export function applyTheme(mode: ThemeMode) {
  try {
    const isDark =
      mode === 'dark' ||
      (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0E1424' : '#F4F6FB')
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
  }

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
    theme === 'dark' ||
    (theme === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  return { theme, setTheme, isDark }
}
