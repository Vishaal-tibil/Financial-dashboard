import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

import KpiRow               from '../components/kpi/KpiRow'
import FinancialRadarChart  from '../components/charts/FinancialRadarChart'
import RevenueLineChart     from '../components/charts/RevenueLineChart'
import EbitdaTable          from '../components/charts/EbitdaTable'
import OperationalTable     from '../components/charts/OperationalTable'
import FCFvsCapexChart      from '../components/charts/FCFvsCapexChart'
import RoceLineChart        from '../components/charts/RoceLineChart'
import HiddenPatternsHeatmap from '../components/charts/HiddenPatternsHeatmap'

// Dev 2 components — imported when ready
// import CompetitiveSection from '../components/competitive/CompetitiveSection'
// import MarketBenchmarkChart from '../components/charts/MarketBenchmarkChart'
// import CorrelationDriversChart from '../components/charts/CorrelationDriversChart'

function SectionHeader({ id, title, badge }) {
  return (
    <div id={id} className="section-header" style={{ scrollMarginTop: 8 }}>
      <span className="section-title">{title}</span>
      {badge && <span className="section-badge">{badge}</span>}
    </div>
  )
}

export default function Overview() {
  const { isDataReady, loadData, navigate } = useApp()

  useEffect(() => {
    if (!isDataReady) {
      // Check if data exists on server before redirecting
      fetch('/api/status')
        .then(r => r.json())
        .then(d => { if (!d.ready) navigate('upload') })
        .catch(() => navigate('upload'))
    }
  }, [isDataReady, loadData, navigate])

  if (!isDataReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)', fontSize: 13 }}>
        Loading dashboard…
      </div>
    )
  }

  return (
    <div>
      {/* ── KPI Row ── */}
      <KpiRow />

      {/* ── Financial Benchmarking ── */}
      <div className="section" id="financial-benchmarking">
        <SectionHeader id="financial-benchmarking-hdr" title="Financial Benchmarking" />
        <div className="grid-2">
          <FinancialRadarChart />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <RevenueLineChart />
            <EbitdaTable />
          </div>
        </div>
      </div>

      {/* ── Operational Benchmarking ── */}
      <div className="section" id="operational-benchmarking">
        <SectionHeader id="operational-benchmarking-hdr" title="Operational Benchmarking" />
        <OperationalTable />
      </div>

      {/* ── Capital Efficiency Ratios ── */}
      <div className="section" id="capital-efficiency">
        <SectionHeader id="capital-efficiency-hdr" title="Capital Efficiency Ratios" />
        <div className="grid-2">
          <FCFvsCapexChart />
          <RoceLineChart />
        </div>
      </div>

      {/* ── Hidden Patterns ── */}
      <div className="section" id="hidden-patterns">
        <SectionHeader id="hidden-patterns-hdr" title="Hidden Patterns" />
        <HiddenPatternsHeatmap />
      </div>

      {/* ── Market Benchmarking ── placeholder for Dev 2 chart */}
      <div className="section" id="market-benchmarking">
        <SectionHeader id="market-benchmarking-hdr" title="Market Benchmarking" />
        <div className="chart-card" style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          Market Benchmarking charts coming soon (Dev 2)
        </div>
      </div>

      {/* ── Competition Intelligence ── placeholder for Dev 2 */}
      <div className="section" id="competitive-intelligence">
        <SectionHeader id="competitive-intelligence-hdr" title="Competition Intelligence Tool" />
        <div className="chart-card" style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          Competitive Intelligence section — Dev 2
        </div>
      </div>
    </div>
  )
}
