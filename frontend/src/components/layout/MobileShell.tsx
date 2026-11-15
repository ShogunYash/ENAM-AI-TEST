import React from 'react'
import { Flame, Search, Sliders, Activity, User, Users } from 'lucide-react'
import { initialsOf, useProfileName } from '@/lib/profile'

export type NavTab = 'today' | 'research' | 'network' | 'thresholds' | 'stats' | 'profile'

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
  const profileName = useProfileName()
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
      id: 'network',
      label: 'Network',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'thresholds',
      label: 'Settings',
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
    <div className="min-h-screen bg-zinc-950 flex justify-center selection:bg-zinc-800 lg:bg-[radial-gradient(70%_55%_at_50%_0%,rgb(var(--brand-primary)/0.16),transparent),radial-gradient(50%_40%_at_100%_100%,rgb(var(--brand-primary)/0.10),transparent)]">
      {/* Mobile-constrained viewport container: 390px base, up to 430px */}
      <div className="w-full max-w-[430px] min-h-screen bg-zinc-950 border-x border-zinc-900/80 flex flex-col relative shadow-2xl lg:shadow-[0_0_80px_rgba(30,41,90,0.28)] lg:border-zinc-800">
        {/* Desktop only: the app is a phone layout, say so beside it */}
        <aside className="hidden lg:block fixed top-24 left-1/2 ml-[245px] w-[230px]">
          <div className="font-mono font-black text-3xl tracking-[0.18em] text-brand-text">FINN</div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            FINN is designed for your phone. Open this link on mobile for the full experience.
          </p>
          <p className="mt-3 text-[11px] font-mono uppercase tracking-wider text-zinc-500">A triage desk, not a news feed</p>
        </aside>
        {/* Brand App Bar */}
        <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-base tracking-wider bg-gradient-to-r from-[#3558E6] to-[#5B7CFF] dark:from-[#8EA4FF] dark:to-[#C7D2FE] bg-clip-text text-transparent">
              FINN
            </span>
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              Triage Desk
            </span>
          </div>

          <button
            type="button"
            onClick={() => onTabChange('profile')}
            aria-label="Profile"
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            className={`min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center touch-manipulation`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors ${
                activeTab === 'profile'
                  ? 'bg-brand text-white border-brand'
                  : 'bg-brand-tint text-brand-text border-zinc-800'
              }`}
            >
              {initialsOf(profileName) || <User className="w-4 h-4" />}
            </span>
          </button>
        </header>
        {/* Slim brand top bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#3558E6] via-[#5B7CFF] to-[#3558E6] dark:from-[#4A69F0] dark:via-[#7C93FF] dark:to-[#4A69F0] flex-shrink-0" />

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
                      ? 'text-brand-text font-bold'
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
                  <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
