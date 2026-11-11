import React, { useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { MobileShell, NavTab } from '@/components/layout/MobileShell'
import { TodayScreen } from '@/components/screens/TodayScreen'
import { ThresholdsScreen } from '@/components/screens/ThresholdsScreen'
import { ResearchScreen } from '@/components/screens/ResearchScreen'
import { StatsScreen } from '@/components/screens/StatsScreen'
import { AskFinnSheet } from '@/components/common/AskFinnSheet'
import { getDigestData } from '@/api/client'
import { useSettings } from '@/lib/settings'
import { Filing } from '@/api/types'
import { WindowOption } from '@/components/today/WindowPicker'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s
      refetchOnWindowFocus: false,
    },
  },
})

function FinnApp() {
  const { settings } = useSettings()
  const [activeTab, setActiveTab] = useState<NavTab>('today')
  const [windowOption, setWindowOption] = useState<WindowOption>(
    (settings.default_window as WindowOption) || '24h'
  )
  const [selectedFilingForAsk, setSelectedFilingForAsk] = useState<Filing | null>(null)

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
          onAskFinn={(filing) => setSelectedFilingForAsk(filing)}
        />
      )}

      {activeTab === 'research' && <ResearchScreen />}

      {activeTab === 'thresholds' && <ThresholdsScreen />}

      {activeTab === 'stats' && <StatsScreen />}

      {/* Ask FINN Copilot Bottom Sheet */}
      <AskFinnSheet
        filing={selectedFilingForAsk}
        onClose={() => setSelectedFilingForAsk(null)}
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
