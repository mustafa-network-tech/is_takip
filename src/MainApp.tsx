import { useCallback, useState } from 'react'
import type { AppView } from './appRoutes'
import TopNav from './components/TopNav'
import { useAuth } from './context/AuthContext'
import type { ProductionSnapshotRow } from './lib/productionHistory'
import type { SoftwareWorkRow } from './lib/softwareHistory'
import ProductionCardApp from './ProductionCardApp'
import DashboardView from './views/DashboardView'
import HistoryView from './views/HistoryView'
import SoftwareWorkView from './views/SoftwareWorkView'

export default function MainApp() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<AppView>('dashboard')
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [editorLayoutKey, setEditorLayoutKey] = useState('init')
  const [initialSnapshot, setInitialSnapshot] =
    useState<ProductionSnapshotRow | null>(null)
  const [softwareLayoutKey, setSoftwareLayoutKey] = useState('sw-init')
  const [softwareInitial, setSoftwareInitial] =
    useState<SoftwareWorkRow | null>(null)

  const bumpData = useCallback(() => {
    setDashboardRefreshKey((k) => k + 1)
    setHistoryRefreshKey((k) => k + 1)
  }, [])

  const goNewJobFresh = useCallback(() => {
    setInitialSnapshot(null)
    setEditorLayoutKey(`fresh-${Date.now()}`)
    setView('new-job')
  }, [])

  const goSoftwareFresh = useCallback(() => {
    setSoftwareInitial(null)
    setSoftwareLayoutKey(`sw-${Date.now()}`)
    setView('software')
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
        setSoftwareInitial(null)
        goNewJobFresh()
        return
      }
      if (v === 'software') {
        setInitialSnapshot(null)
        goSoftwareFresh()
        return
      }
      if (v === 'dashboard') {
        setInitialSnapshot(null)
        setSoftwareInitial(null)
        goDashboard()
        return
      }
      if (v === 'history') {
        setInitialSnapshot(null)
        setSoftwareInitial(null)
        goHistory()
      }
    },
    [goNewJobFresh, goSoftwareFresh, goDashboard, goHistory],
  )

  const handleLoadFromHistoryProduction = useCallback(
    (row: ProductionSnapshotRow) => {
      setInitialSnapshot(row)
      setEditorLayoutKey(`snap-${row.id}`)
      setView('new-job')
    },
    [],
  )

  const handleLoadFromHistorySoftware = useCallback((row: SoftwareWorkRow) => {
    setSoftwareInitial(row)
    setSoftwareLayoutKey(`sw-${row.id}`)
    setView('software')
  }, [])

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-zinc-100/80">
      <TopNav
        active={view}
        onNavigate={handleNavigate}
        userEmail={
          user?.is_anonymous ? 'Misafir oturumu (üyelik yok)' : user?.email
        }
        onSignOut={signOut}
      />

      <main className="min-h-0 flex-1 overflow-y-auto bg-zinc-100/80">
        {view === 'dashboard' ? (
          <DashboardView refreshKey={dashboardRefreshKey} />
        ) : null}
        {view === 'history' ? (
          <HistoryView
            refreshKey={historyRefreshKey}
            onLoadProduction={handleLoadFromHistoryProduction}
            onLoadSoftware={handleLoadFromHistorySoftware}
            onOpenNewProduction={goNewJobFresh}
            onOpenSoftware={goSoftwareFresh}
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
        {view === 'software' ? (
          <SoftwareWorkView
            key={softwareLayoutKey}
            initialEntry={softwareInitial}
            onSaved={bumpData}
          />
        ) : null}
      </main>
    </div>
  )
}
