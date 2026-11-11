import { useState, useEffect } from 'react'
import { Settings, DEFAULT_SETTINGS, Category } from '@/api/types'

const SETTINGS_STORAGE_KEY = 'finn_settings_v1'

export function getStoredSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (e) {
    console.error('Failed to parse settings from localStorage', e)
  }
  return DEFAULT_SETTINGS
}

export function saveStoredSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings to localStorage', e)
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(getStoredSettings)

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
        try {
          setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) })
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const updateSettings = (updater: Partial<Settings> | ((prev: Settings) => Settings)) => {
    setSettingsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      saveStoredSettings(next)
      return next
    })
  }

  const toggleCategoryInterest = (category: Category) => {
    updateSettings((prev) => {
      const isCurrentlyInterested = prev.categories_of_interest.includes(category)
      const nextInterested = isCurrentlyInterested
        ? prev.categories_of_interest.filter((c) => c !== category)
        : [...prev.categories_of_interest, category]
      
      // If adding to interested, ensure it's not in muted
      const nextMuted = prev.muted_categories.filter((c) => c !== category)
      return {
        ...prev,
        categories_of_interest: nextInterested,
        muted_categories: nextMuted,
      }
    })
  }

  const toggleCategoryMuted = (category: Category) => {
    updateSettings((prev) => {
      const isCurrentlyMuted = prev.muted_categories.includes(category)
      const nextMuted = isCurrentlyMuted
        ? prev.muted_categories.filter((c) => c !== category)
        : [...prev.muted_categories, category]
      
      // If muting, remove from interested
      const nextInterested = prev.categories_of_interest.filter((c) => c !== category)
      return {
        ...prev,
        categories_of_interest: nextInterested,
        muted_categories: nextMuted,
      }
    })
  }

  const resetSettings = () => {
    updateSettings(DEFAULT_SETTINGS)
  }

  return {
    settings,
    updateSettings,
    toggleCategoryInterest,
    toggleCategoryMuted,
    resetSettings,
  }
}
