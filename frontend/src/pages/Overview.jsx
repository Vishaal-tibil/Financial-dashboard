import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

import KpiRow              from '../components/kpi/KpiRow'
import FinancialRadarChart  from '../components/charts/FinancialRadarChart'
import RevenueLineChart     from '../components/charts/RevenueLineChart'
import OperationalTable     from '../components/charts/OperationalTable'
import QuadrantMatrix       from '../components/charts/QuadrantMatrix'
import EbitdaTable          from '../components/charts/EbitdaTable'
import CompetitiveSection   from '../components/competitive/CompetitiveSection'

function SectionHeader({ id, title, badge }) {
  return (
    <div id={id} className="section-header" style={{ scrollMarginTop: 8 }}>
      <span className="section-title">{title}</span>
      {badge && <span className="section-badge">{badge}</span>}
    </div>
  )
}

export default function Overview() {
  const { isDataReady, navigate } = useApp()

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

  return (
    <div className="overview-root">

      {/* ── KPI Strip ── */}
      <KpiRow />

      {/* ── Row 1: Financial Benchmarking (radar+line) | Operational Benchmarking (table) ── */}
      <div className="overview-row1">

        <div id="financial-benchmarking" className="overview-col min-w-0">
          <SectionHeader id="financial-benchmarking-hdr" title="Financial Benchmarking" />
          <div className="fin-inner-grid">
            <FinancialRadarChart />
            <RevenueLineChart />
          </div>
        </div>

        <div id="operational-benchmarking" className="overview-col min-w-0">
          <SectionHeader id="operational-benchmarking-hdr" title="Operational Benchmarking" />
          <OperationalTable />
        </div>

      </div>

      {/* ── Row 2: Capital Efficiency Matrix | Margin Waterfall Benchmark ── */}
      <div className="overview-row2">

        <div id="capital-efficiency" className="overview-col min-w-0">
          <SectionHeader id="capital-efficiency-hdr" title="Capital Efficiency Matrix" />
          <QuadrantMatrix />
        </div>

        <div id="operational-benchmarking-margin" className="overview-col min-w-0">
          <SectionHeader title="Margin Waterfall Benchmark" />
          <EbitdaTable />
        </div>

      </div>

      {/* ── Competitive Intelligence Feed ── */}
      <div id="competitive-intelligence" className="section">
        <SectionHeader id="competitive-intelligence-hdr" title="Competition Intelligence" />
        <CompetitiveSection />
      </div>

    </div>
  )
}
