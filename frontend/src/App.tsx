import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { MobileShell, NavTab } from '@/components/layout/MobileShell'
import { TodayScreen } from '@/components/screens/TodayScreen'
import { ThresholdsScreen } from '@/components/screens/ThresholdsScreen'
import { ResearchScreen } from '@/components/screens/ResearchScreen'
import { StatsScreen } from '@/components/screens/StatsScreen'
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

function FinnApp() {
  useTheme()
  const { settings } = useSettings()
  const getInitialTab = (): NavTab => {
    try {
      const hash = window.location.hash.replace(/^#/, '')
      if (hash === 'research' || hash === 'thresholds' || hash === 'stats' || hash === 'today') {
        return hash as NavTab
      }
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'research' || tabParam === 'thresholds' || tabParam === 'stats' || tabParam === 'today') {
        return tabParam as NavTab
      }
    } catch {}
    return 'today'
  }
  const [activeTab, setActiveTab] = useState<NavTab>(getInitialTab)
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
      if (hash === 'today' || hash === 'research' || hash === 'thresholds' || hash === 'stats') {
        setActiveTab(hash as NavTab)
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

      {activeTab === 'thresholds' && <ThresholdsScreen />}

      {activeTab === 'stats' && <StatsScreen />}

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
      <FinnApp />
    </QueryClientProvider>
  )
}
