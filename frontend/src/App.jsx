import { useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { useHealthScore }  from './hooks/useHealthScore'
import Sidebar       from './components/layout/Sidebar'
import TopBar        from './components/layout/TopBar'
import RightPanel    from './components/layout/RightPanel'
import UploadPage    from './pages/UploadPage'
import Overview      from './pages/Overview'
import InsightStudio from './pages/InsightStudio'

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
  const { currentPage, panelOpen } = useApp()
  const health = useHealthScore()

  // Apply / remove theme class on :root so CSS variables cascade throughout the app
  useEffect(() => {
    const el    = document.documentElement
    const tiers = ['theme-thriving', 'theme-stable', 'theme-caution', 'theme-concern']
    tiers.forEach(t => el.classList.remove(t))
    if (health) el.classList.add(`theme-${health.tier}`)
    return () => tiers.forEach(t => el.classList.remove(t))
  }, [health?.tier])

  if (currentPage === 'connecting') return <ConnectingScreen />
  if (currentPage === 'upload')     return <UploadPage />

  const Page = PAGE_MAP[currentPage] || Overview

  return (
    <div className="app-shell">
      <Sidebar />
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
