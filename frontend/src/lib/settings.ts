import { useState, useEffect } from 'react'
import { Settings, DEFAULT_SETTINGS, Category } from '@/api/types'

const SETTINGS_STORAGE_KEY = 'finn_settings_v1'

export function normalizeSettings(raw: any): Settings {
  const merged: Settings = { ...DEFAULT_SETTINGS, ...raw }
  // Normalization rule: if a category is in both categories_of_interest and muted_categories,
  // muted wins (remove from categories_of_interest)
  const mutedSet = new Set(merged.muted_categories || [])
  const cleanedInterest = (merged.categories_of_interest || []).filter(
    (c: Category) => !mutedSet.has(c)
  )
  return {
    ...merged,
    categories_of_interest: cleanedInterest,
    muted_categories: Array.from(mutedSet),
  }
}

export function getStoredSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return normalizeSettings(parsed)
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

  const setCategoryTriState = (category: Category, state: 'boost' | 'normal' | 'hide') => {
    updateSettings((prev) => {
      const withoutInterest = prev.categories_of_interest.filter((c) => c !== category)
      const withoutMuted = prev.muted_categories.filter((c) => c !== category)

      if (state === 'boost') {
        return {
          ...prev,
          categories_of_interest: [...withoutInterest, category],
          muted_categories: withoutMuted,
        }
      }
      if (state === 'hide') {
        return {
          ...prev,
          categories_of_interest: withoutInterest,
          muted_categories: [...withoutMuted, category],
        }
      }
      // normal: removed from both
      return {
        ...prev,
        categories_of_interest: withoutInterest,
        muted_categories: withoutMuted,
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
    setCategoryTriState,
    resetSettings,
  }
}

export function getCategoryTriState(
  category: Category,
  settings: Settings
): 'boost' | 'normal' | 'hide' {
  if (settings.muted_categories.includes(category)) return 'hide'
  if (settings.categories_of_interest.includes(category)) return 'boost'
  return 'normal'
}
