import { AppProvider, useApp } from './context/AppContext'
import Sidebar       from './components/layout/Sidebar'
import TopBar        from './components/layout/TopBar'
import RightPanel    from './components/layout/RightPanel'
import UploadPage    from './pages/UploadPage'
import Overview      from './pages/Overview'
import InsightStudio from './pages/InsightStudio'

const PAGE_MAP = {
  upload:          UploadPage,
  overview:        Overview,
  'insight-studio': InsightStudio,
}

function Shell() {
  const { currentPage } = useApp()

  if (currentPage === 'upload') return <UploadPage />

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
          <RightPanel />
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
