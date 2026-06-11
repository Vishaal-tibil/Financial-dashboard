import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

import KpiRow                from '../components/kpi/KpiRow'
import FinancialRadarChart   from '../components/charts/FinancialRadarChart'
import RevenueLineChart      from '../components/charts/RevenueLineChart'
import EbitdaTable           from '../components/charts/EbitdaTable'
import WaterfallChart        from '../components/charts/WaterfallChart'
import QuadrantMatrix        from '../components/charts/QuadrantMatrix'
import HiddenPatternsHeatmap from '../components/charts/HiddenPatternsHeatmap'

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
      {/* ── KPI Row ── */}
      <KpiRow />

      {/* ── Row 1: Financial Benchmarking ++ Operational (Waterfall) ── */}
      <div className="overview-row1">

        <div id="financial-benchmarking" className="overview-col min-w-0">
          <SectionHeader id="financial-benchmarking-hdr" title="Financial Benchmarking" />
          <div className="fin-inner-grid">
            <FinancialRadarChart />
            <div className="fin-right-stack">
              <RevenueLineChart />
              <EbitdaTable />
            </div>
          </div>
        </div>

        <div id="operational-benchmarking" className="overview-col min-w-0">
          <SectionHeader id="operational-benchmarking-hdr" title="Operational Benchmarking" />
          <WaterfallChart />
        </div>

      </div>

      {/* ── Row 2: Capital Efficiency Matrix ++ Hidden Patterns ── */}
      <div className="overview-row2">

        <div id="capital-efficiency" className="overview-col min-w-0">
          <SectionHeader id="capital-efficiency-hdr" title="Capital Efficiency Matrix" />
          <QuadrantMatrix />
        </div>

        <div id="hidden-patterns" className="overview-col min-w-0">
          <SectionHeader id="hidden-patterns-hdr" title="Hidden Patterns" />
          <HiddenPatternsHeatmap />
        </div>

      </div>

      {/* ── Competitive Intelligence — Dev 2 ── */}
      <div id="competitive-intelligence" className="section">
        <SectionHeader id="competitive-intelligence-hdr" title="Competition Intelligence Tool" />
        <div className="chart-card" style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          Competitive Intelligence — Dev 2
        </div>
      </div>
    </div>
  )
}
