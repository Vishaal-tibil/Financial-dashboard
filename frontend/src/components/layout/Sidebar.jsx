import { useState } from 'react'
import {
  BarChart2, Activity, TrendingUp, Target,
  Sparkles, Sliders, FileText, Database,
  Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const NAV = [
  { id: 'financial-benchmarking',    label: 'Financial Benchmarking',    icon: BarChart2   },
  { id: 'operational-benchmarking',  label: 'Operational Benchmarking',  icon: Activity    },
  { id: 'market-benchmarking',       label: 'Market Benchmarking',       icon: TrendingUp  },
  { id: 'competitive-intelligence',  label: 'Competitive Intelligence',  icon: Target      },
  { id: 'ai-insights',               label: 'AI Insights',               icon: Sparkles    },
  { id: 'scenarios',                 label: 'Scenarios & What If',       icon: Sliders     },
  { id: 'reports',                   label: 'Reports',                   icon: FileText    },
  { id: 'data-dictionary',           label: 'Data Dictionary',           icon: Database    },
]

export default function Sidebar() {
  const { activeSection, setActiveSection } = useApp()
  const [collapsed, setCollapsed] = useState(false)

  function scrollTo(id) {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">F</div>
        {!collapsed && <span className="logo-text">FinCompare</span>}
      </div>

      {/* Nav items */}
      <div className="sidebar-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            className={`nav-item${activeSection === id ? ' active' : ''}`}
            onClick={() => scrollTo(id)}
            title={collapsed ? label : undefined}
          >
            <Icon />
            {!collapsed && <span className="nav-label">{label}</span>}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="nav-item" title={collapsed ? 'Settings' : undefined}>
          <Settings />
          {!collapsed && <span className="nav-label">Settings</span>}
        </div>
        <div className="nav-item" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
          {!collapsed && <span className="nav-label">Collapse</span>}
        </div>
      </div>
    </nav>
  )
}
