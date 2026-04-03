import { useCallback, useState } from 'react'
import type { AppView } from './appRoutes'
import TopNav from './components/TopNav'
import { useAuth } from './context/AuthContext'
import ProductionCardApp from './ProductionCardApp'
import type { ProductionSnapshotRow } from './lib/productionHistory'
import DashboardView from './views/DashboardView'
import HistoryView from './views/HistoryView'

export default function MainApp() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<AppView>('dashboard')
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [editorLayoutKey, setEditorLayoutKey] = useState('init')
  const [initialSnapshot, setInitialSnapshot] =
    useState<ProductionSnapshotRow | null>(null)

  const bumpData = useCallback(() => {
    setDashboardRefreshKey((k) => k + 1)
    setHistoryRefreshKey((k) => k + 1)
  }, [])

  const goNewJobFresh = useCallback(() => {
    setInitialSnapshot(null)
    setEditorLayoutKey(`fresh-${Date.now()}`)
    setView('new-job')
  }, [])

  const goDashboard = useCallback(() => {
    setView('dashboard')
  }, [])

  const goHistory = useCallback(() => {
    setView('history')
  }, [])

  const handleNavigate = useCallback(
    (v: AppView) => {
      if (v === 'new-job') {
        goNewJobFresh()
        return
      }
      if (v === 'dashboard') {
        setInitialSnapshot(null)
        goDashboard()
        return
      }
      if (v === 'history') {
        setInitialSnapshot(null)
        goHistory()
      }
    },
    [goNewJobFresh, goDashboard, goHistory],
  )

  const handleLoadFromHistory = useCallback((row: ProductionSnapshotRow) => {
    setInitialSnapshot(row)
    setEditorLayoutKey(`snap-${row.id}`)
    setView('new-job')
  }, [])

  return (
    <div className="min-h-dvh bg-zinc-100/80">
      <TopNav
        active={view}
        onNavigate={handleNavigate}
        userEmail={user?.email}
        onSignOut={signOut}
      />

      <main className="min-h-[calc(100dvh-4.5rem)] bg-zinc-100/80">
        {view === 'dashboard' ? (
          <DashboardView refreshKey={dashboardRefreshKey} />
        ) : null}
        {view === 'history' ? (
          <HistoryView
            refreshKey={historyRefreshKey}
            onLoadInEditor={handleLoadFromHistory}
            onOpenNewJob={goNewJobFresh}
            onDataChanged={bumpData}
          />
        ) : null}
        {view === 'new-job' ? (
          <ProductionCardApp
            key={editorLayoutKey}
            initialSnapshot={initialSnapshot}
            onSaved={bumpData}
          />
        ) : null}
      </main>
    </div>
  )
}
