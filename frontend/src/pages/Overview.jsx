import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

import KpiRow              from '../components/kpi/KpiRow'
import FinancialRadarChart  from '../components/charts/FinancialRadarChart'
import RevenueLineChart     from '../components/charts/RevenueLineChart'
import OperationalTable     from '../components/charts/OperationalTable'
import QuadrantMatrix       from '../components/charts/QuadrantMatrix'
import EbitdaTable          from '../components/charts/EbitdaTable'
import CompetitiveSection   from '../components/competitive/CompetitiveSection'

function SectionHeader({ title, badge }) {
  return (
    <div className="section-header">
      <span className="section-title">{title}</span>
      {badge && <span className="section-badge">{badge}</span>}
    </div>
  )
}

export default function Overview() {
  const { isDataReady, navigate, activeSection } = useApp()

  useEffect(() => {
    if (!isDataReady) {
      fetch('/api/status')
        .then(r => r.json())
        .then(d => { if (!d.ready) navigate('upload') })
        .catch(() => navigate('upload'))
    }
  }, [isDataReady, navigate])

  if (!isDataReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)', fontSize: 13 }}>
        Loading dashboard…
      </div>
    )
  }

  const section = activeSection || 'overview'

  // ── Full dashboard view (default) ──────────────────────────────────────────
  if (section === 'overview') {
    return (
      <div className="overview-root">
        <KpiRow />

        <div className="overview-row1">
          <div className="overview-col min-w-0">
            <SectionHeader title="Financial Benchmarking" />
            <div className="fin-inner-grid">
              <FinancialRadarChart />
              <RevenueLineChart />
            </div>
          </div>
          <div className="overview-col min-w-0">
            <SectionHeader title="Operational Benchmarking" />
            <OperationalTable />
          </div>
        </div>

        <div className="overview-row2">
          <div className="overview-col min-w-0">
            <SectionHeader title="Capital Efficiency Matrix" />
            <QuadrantMatrix />
          </div>
          <div className="overview-col min-w-0">
            <SectionHeader title="Margin Waterfall Benchmark" />
            <EbitdaTable />
          </div>
        </div>

        <div className="section">
          <SectionHeader title="Competition Intelligence" />
          <CompetitiveSection />
        </div>
      </div>
    )
  }

  // ── Drill-down section pages ───────────────────────────────────────────────
  return (
    <div className="overview-root">
      <KpiRow />

      {section === 'financial-benchmarking' && (
        <div className="section">
          <SectionHeader title="Financial Benchmarking" />
          <div className="fin-inner-grid">
            <FinancialRadarChart />
            <RevenueLineChart />
          </div>
        </div>
      )}

      {section === 'operational-benchmarking' && (
        <div className="section">
          <SectionHeader title="Operational Benchmarking" />
          <OperationalTable />
        </div>
      )}

      {section === 'capital-efficiency' && (
        <div className="section">
          <SectionHeader title="Capital Efficiency" />
          <div className="overview-row2">
            <div className="overview-col min-w-0"><QuadrantMatrix /></div>
            <div className="overview-col min-w-0"><EbitdaTable /></div>
          </div>
        </div>
      )}

      {section === 'competitive-intelligence' && (
        <div className="section">
          <SectionHeader title="Competition Intelligence" />
          <CompetitiveSection />
        </div>
      )}
    </div>
  )
}
