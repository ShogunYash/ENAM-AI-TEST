import React from 'react'
import { Flame, Search, Sliders, Activity } from 'lucide-react'

export type NavTab = 'today' | 'research' | 'thresholds' | 'stats'

interface MobileShellProps {
  children: React.ReactNode
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
  needsYouCount?: number
  alertCount?: number
}

export const MobileShell: React.FC<MobileShellProps> = ({
  children,
  activeTab,
  onTabChange,
  needsYouCount = 0,
  alertCount = 0,
}) => {
  const tabs: Array<{
    id: NavTab
    label: string
    icon: React.ReactNode
    badge?: number
  }> = [
    {
      id: 'today',
      label: 'Today',
      icon: <Flame className="w-5 h-5" />,
      badge: needsYouCount > 0 ? needsYouCount : undefined,
    },
    {
      id: 'research',
      label: 'Research',
      icon: <Search className="w-5 h-5" />,
    },
    {
      id: 'thresholds',
      label: 'Thresholds',
      icon: <Sliders className="w-5 h-5" />,
      badge: alertCount > 0 ? alertCount : undefined,
    },
    {
      id: 'stats',
      label: 'Cost',
      icon: <Activity className="w-5 h-5" />,
    },
  ]

  return (
    <div className="min-h-screen bg-black flex justify-center selection:bg-zinc-800">
      {/* Mobile-constrained viewport container: 390px base, up to 430px */}
      <div className="w-full max-w-[430px] min-h-screen bg-zinc-950 border-x border-zinc-900/80 flex flex-col relative shadow-2xl">
        {/* Brand App Bar */}
        <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-base tracking-wider text-zinc-100">
              FINN
            </span>
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              Triage Desk
            </span>
          </div>

          <div className="text-[11px] text-zinc-400 font-mono">
            NSE · BSE
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 px-3.5 pt-2 overflow-y-auto">
          {children}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 px-2 py-1.5">
          <div className="flex items-center justify-around">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl min-h-[48px] touch-manipulation transition-colors relative ${
                    isActive
                      ? 'text-zinc-100 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <div className="relative">
                    {tab.icon}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] text-[9px] font-mono font-bold rounded-full bg-rose-500 text-white flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
