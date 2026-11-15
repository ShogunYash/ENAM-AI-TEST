import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { MobileShell, NavTab } from '@/components/layout/MobileShell'
import { TodayScreen } from '@/components/screens/TodayScreen'
import { ThresholdsScreen } from '@/components/screens/ThresholdsScreen'
import { ResearchScreen } from '@/components/screens/ResearchScreen'
import { StatsScreen } from '@/components/screens/StatsScreen'
import { ProfileScreen } from '@/components/screens/ProfileScreen'
import { NetworkScreen } from '@/components/network/NetworkScreen'
import { PersonProvider } from '@/components/network/PersonProvider'
import { Splash } from '@/components/common/Splash'
import { AskFinnSheet, AskFinnTarget } from '@/components/common/AskFinnSheet'
import { getDigestData } from '@/api/client'
import { useSettings } from '@/lib/settings'
import { Filing, SourceDoc } from '@/api/types'
import { WindowOption } from '@/components/today/WindowPicker'
import { useTheme } from '@/lib/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s
      refetchOnWindowFocus: false,
    },
  },
})

const TAB_KEY = 'finn.tab'
const TABS = ['today', 'research', 'network', 'thresholds', 'stats', 'profile']
const isTab = (v: string | null): v is NavTab => !!v && TABS.includes(v)

function FinnApp() {
  useTheme()
  const { settings } = useSettings()
  const getInitialTab = (): NavTab => {
    try {
      const hash = window.location.hash.replace(/^#/, '')
      if (isTab(hash)) {
        return hash as NavTab
      }
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (isTab(tabParam)) {
        return tabParam as NavTab
      }
      // reload: come back to the section the user was in
      const saved = localStorage.getItem(TAB_KEY)
      if (isTab(saved)) return saved
    } catch {}
    return 'today'
  }
  const [activeTab, setActiveTabState] = useState<NavTab>(getInitialTab)
  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab)
    try {
      localStorage.setItem(TAB_KEY, tab)
      if (window.location.hash !== `#${tab}`) window.history.replaceState(null, '', `#${tab}`)
    } catch {}
  }
  const [windowOption, setWindowOption] = useState<WindowOption>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const winParam = params.get('window') as WindowOption
      if (winParam === '24h' || winParam === '3d' || winParam === '7d' || winParam === '30d') {
        return winParam
      }
    } catch {}
    return (settings.default_window as WindowOption) || '24h'
  })
  const [askTarget, setAskTarget] = useState<AskFinnTarget | null>(null)

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '')
      if (isTab(hash)) {
        setActiveTabState(hash as NavTab)
        try {
          localStorage.setItem(TAB_KEY, hash)
        } catch {}
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const {
    data: digestResult,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['digest', windowOption, settings.volume_multiple, settings.price_move_pct],
    queryFn: () => getDigestData(windowOption, settings),
  })

  const needsYouCount = digestResult?.digest?.needs_you?.length || 0
  const alertCount = digestResult?.digest?.alerts?.length || 0

  return (
    <MobileShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      needsYouCount={needsYouCount}
      alertCount={alertCount}
    >
      {activeTab === 'today' && (
        <TodayScreen
          digestResult={digestResult || null}
          isLoading={isLoading}
          isRefreshing={isFetching}
          windowOption={windowOption}
          onWindowChange={setWindowOption}
          onRefresh={() => refetch()}
          onAskFinn={(filing) => setAskTarget({ screen: 'filing', filing })}
        />
      )}

      {activeTab === 'research' && (
        <ResearchScreen
          onAskFinn={(symbol, sourceDocs) =>
            setAskTarget({ screen: 'research', symbol, sourceDocs })
          }
        />
      )}

      {activeTab === 'network' && <NetworkScreen />}

      {activeTab === 'thresholds' && <ThresholdsScreen />}

      {activeTab === 'stats' && <StatsScreen />}

      {activeTab === 'profile' && <ProfileScreen />}

      {/* Ask FINN Grounded Copilot Bottom Sheet */}
      <AskFinnSheet
        target={askTarget}
        onClose={() => setAskTarget(null)}
        isLiveService={digestResult?.isLive ?? false}
      />
    </MobileShell>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Splash />
      <PersonProvider>
        <FinnApp />
      </PersonProvider>
    </QueryClientProvider>
  )
}
