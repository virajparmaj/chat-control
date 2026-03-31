import { useState, useEffect } from 'react'
import { OverlayShell } from './components/layout/OverlayShell'
import { DashboardShell } from './components/layout/DashboardShell'

type AppView = 'dashboard' | 'overlay'

function getViewFromHash(): AppView {
  const hash = window.location.hash
  if (hash.includes('overlay')) return 'overlay'
  return 'dashboard'
}

function App(): React.JSX.Element {
  const [view, setView] = useState<AppView>(getViewFromHash)

  useEffect(() => {
    const onHashChange = (): void => setView(getViewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (view === 'overlay') {
    return <OverlayShell />
  }

  return <DashboardShell />
}

export default App
