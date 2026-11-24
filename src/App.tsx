import { useState } from 'react'
import type { NavState, TestExecution } from './types/domain'
import HomeScreen from './screens/HomeScreen'
import AssetScreen from './screens/AssetScreen'
import TestListScreen from './screens/TestListScreen'
import ISTListScreen from './screens/ISTListScreen'
import ExecutionScreen from './screens/ExecutionScreen'

export default function App() {
  const [nav, setNav] = useState<NavState>({ screen: 'home' })

  const goHome = () => setNav({ screen: 'home' })

  const openExecution = (execution: TestExecution) =>
    setNav({ screen: 'execution', execution })

  switch (nav.screen) {
    case 'home':
      return (
        <HomeScreen
          onFAT={() => setNav({ screen: 'asset-select', testType: 'FAT' })}
          onSAT={() => setNav({ screen: 'asset-select', testType: 'SAT' })}
          onIST={() => setNav({ screen: 'ist-list' })}
        />
      )
    case 'asset-select':
      return (
        <AssetScreen
          testType={nav.testType}
          onBack={goHome}
          onSelect={(asset) => setNav({ screen: 'test-list', testType: nav.testType, asset })}
        />
      )
    case 'test-list':
      return (
        <TestListScreen
          testType={nav.testType}
          asset={nav.asset}
          onBack={() => setNav({ screen: 'asset-select', testType: nav.testType })}
          onSelect={openExecution}
        />
      )
    case 'ist-list':
      return (
        <ISTListScreen
          onBack={goHome}
          onSelect={openExecution}
        />
      )
    case 'execution':
      return (
        <ExecutionScreen
          execution={nav.execution}
          onBack={() => window.history.length > 1 ? window.history.back() : goHome()}
          onUpdated={(updated) => setNav({ screen: 'execution', execution: updated })}
          onClose={goHome}
        />
      )
  }
}
