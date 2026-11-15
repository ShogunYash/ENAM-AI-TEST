import { createContext, useContext, useState, type ReactNode } from 'react'
import { PersonSheet } from './PersonSheet'

const PersonContext = createContext<(id: string) => void>(() => {})
export const useOpenPerson = () => useContext(PersonContext)

export function PersonProvider({ children }: { children: ReactNode }) {
  const [personId, setPersonId] = useState<string | null>(null)
  return (
    <PersonContext.Provider value={setPersonId}>
      {children}
      {personId && <PersonSheet personId={personId} onClose={() => setPersonId(null)} />}
    </PersonContext.Provider>
  )
}
