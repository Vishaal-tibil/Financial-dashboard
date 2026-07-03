import { useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { useHealthScore }  from './hooks/useHealthScore'
import Sidebar       from './components/layout/Sidebar'
import TopBar        from './components/layout/TopBar'
import RightPanel    from './components/layout/RightPanel'
import UploadPage    from './pages/UploadPage'
import Overview      from './pages/Overview'
import InsightStudio from './pages/InsightStudio'
import LoginPage     from './pages/LoginPage'

const PAGE_MAP = {
  upload:            UploadPage,
  overview:          Overview,
  'insight-studio':  InsightStudio,
}

function ConnectingScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
      background: 'var(--bg-base)', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
        Connecting to backend…
      </div>
    </div>
  )
}

function Shell() {
  const { currentPage, panelOpen, isAuthenticated, logout, authUser } = useApp()
  const health = useHealthScore()

  useEffect(() => {
    const el    = document.documentElement
    const tiers = ['theme-thriving', 'theme-stable', 'theme-caution', 'theme-concern']
    tiers.forEach(t => el.classList.remove(t))
    if (health) el.classList.add(`theme-${health.tier}`)
    return () => tiers.forEach(t => el.classList.remove(t))
  }, [health?.tier])

  // Checking auth token
  if (isAuthenticated === null) return <ConnectingScreen />

  // Not logged in
  if (!isAuthenticated) return <LoginPage />

  if (currentPage === 'connecting') return <ConnectingScreen />
  if (currentPage === 'upload')     return <UploadPage />

  const Page = PAGE_MAP[currentPage] || Overview

  return (
    <div className="app-shell">
      <Sidebar authUser={authUser} onLogout={logout} />
      <div className="main-wrapper">
        <TopBar />
        <div className="content-with-panel">
          <div className="page-content">
            <Page />
          </div>
          {panelOpen && <RightPanel />}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
