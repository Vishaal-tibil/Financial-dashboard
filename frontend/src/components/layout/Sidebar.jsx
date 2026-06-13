import { useState } from 'react'
import {
  LayoutDashboard, BarChart2, Activity, TrendingUp, Target,
  ChevronLeft, ChevronRight, Layers,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const HOME_ITEM = { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, page: null }

const NAV = [
  { id: 'financial-benchmarking',   label: 'Financial',          icon: BarChart2,  page: null },
  { id: 'operational-benchmarking', label: 'Operational',        icon: Activity,   page: null },
  { id: 'capital-efficiency',       label: 'Capital Efficiency', icon: TrendingUp, page: null },
  { id: 'competitive-intelligence', label: 'Competitive Intel',  icon: Target,     page: null },
]

const STUDIO_ITEM = { id: 'insight-studio', label: 'Insight Studio', icon: Layers, page: 'insight-studio' }

export default function Sidebar() {
  const { activeSection, setActiveSection, navigate, currentPage } = useApp()
  const [collapsed, setCollapsed] = useState(false)

  function handleNav(item) {
    if (item.page) {
      navigate(item.page)
      setActiveSection(item.id)
    } else {
      if (currentPage !== 'overview') navigate('overview')
      setActiveSection(item.id)
    }
  }

  const isActive = (item) =>
    item.page
      ? currentPage === item.page
      : currentPage === 'overview' && activeSection === item.id

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon" style={{ fontSize: 11, letterSpacing: '-0.5px' }}>FD</div>
        {!collapsed && <span className="logo-text">FinCompare</span>}
      </div>

      {/* Main nav */}
      <div className="sidebar-nav">

        {/* Dashboard home */}
        <div className="sidebar-nav-group">
          <div
            className={`nav-item${isActive(HOME_ITEM) ? ' active' : ''}`}
            onClick={() => handleNav(HOME_ITEM)}
            title={collapsed ? HOME_ITEM.label : undefined}
          >
            <HOME_ITEM.icon />
            {!collapsed && <span className="nav-label">{HOME_ITEM.label}</span>}
          </div>
        </div>

        <div className="sidebar-divider" />

        {/* Section drill-downs */}
        <div className="sidebar-nav-group">
          {!collapsed && <div className="sidebar-group-label">Sections</div>}
          {NAV.map(item => (
            <div
              key={item.id}
              className={`nav-item${isActive(item) ? ' active' : ''}`}
              onClick={() => handleNav(item)}
              title={collapsed ? item.label : undefined}
            >
              <item.icon />
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </div>
          ))}
        </div>

        <div className="sidebar-divider" />

        {/* Insight Studio */}
        <div className="sidebar-nav-group">
          {!collapsed && <div className="sidebar-group-label">Intelligence</div>}
          <div
            className={`nav-item nav-item-studio${isActive(STUDIO_ITEM) ? ' active' : ''}`}
            onClick={() => handleNav(STUDIO_ITEM)}
            title={collapsed ? STUDIO_ITEM.label : undefined}
          >
            <STUDIO_ITEM.icon />
            {!collapsed && (
              <span className="nav-label">
                {STUDIO_ITEM.label}
                <span className="nav-badge">AI</span>
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Collapse toggle */}
      <div className="sidebar-bottom">
        <div className="nav-item" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
          {!collapsed && <span className="nav-label">Collapse</span>}
        </div>
      </div>
    </nav>
  )
}
