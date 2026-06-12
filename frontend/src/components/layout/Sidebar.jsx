import { useState } from 'react'
import {
  BarChart2, Activity, TrendingUp, Target,
  ChevronLeft, ChevronRight, Layers,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const NAV = [
  { id: 'financial-benchmarking',   label: 'Financial',           icon: BarChart2,  page: null },
  { id: 'operational-benchmarking', label: 'Operational',         icon: Activity,   page: null },
  { id: 'capital-efficiency',       label: 'Capital Efficiency',  icon: TrendingUp, page: null },
  { id: 'competitive-intelligence', label: 'Competitive Intel',   icon: Target,     page: null },
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
      // Scroll after brief delay so page renders first
      setTimeout(() => {
        const el = document.getElementById(item.id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }

  const isActive = (item) =>
    item.page ? currentPage === item.page : (currentPage === 'overview' && activeSection === item.id)

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">F</div>
        {!collapsed && <span className="logo-text">FinCompare</span>}
      </div>

      {/* Main nav */}
      <div className="sidebar-nav">
        <div className="sidebar-nav-group">
          {!collapsed && <div className="sidebar-group-label">Dashboard</div>}
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

        {/* Divider */}
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
