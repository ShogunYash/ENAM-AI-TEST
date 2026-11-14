import { useEffect, useState } from 'react'

const NAME_KEY = 'finn.profile.name'
const EVENT = 'finn-profile-changed'

export function getProfileName(): string {
  try {
    return (localStorage.getItem(NAME_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function setProfileName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 40))
    window.dispatchEvent(new Event(EVENT))
  } catch {}
}

/** First letters of up to two words, or '' when no name is set. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** The investor's display name: stored on this device only, never sent anywhere. */
export function useProfileName(): string {
  const [name, setName] = useState(getProfileName)
  useEffect(() => {
    const sync = () => setName(getProfileName())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return name
}
