import { Line } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'

export default function RevenueLineChart() {
  const { metrics, companies, primaryCompany, selectedCompanies, selectedYears } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  // Use the union of years from primary company, trimmed to selectedYears
  const primaryMetrics = metrics[primaryCompany] || {}
  const allYears       = (primaryMetrics.years || []).slice(-selectedYears)

  const datasets = visible.map(c => {
    const m    = metrics[c.name] || {}
    const yIdx = (m.years || []).reduce((acc, y, i) => { acc[y] = i; return acc }, {})
    const vals = allYears.map(y => (yIdx[y] !== undefined ? m.sales?.[yIdx[y]] : null))
    return {
      label:           c.name,
      data:            vals,
      borderColor:     c.color,
      backgroundColor: `${c.color}18`,
      tension:         0.35,
      pointRadius:     3,
      pointHoverRadius: 5,
      borderWidth:     2,
      fill:            c.name === primaryCompany,
    }
  })

  const data = { labels: allYears.map(String), datasets }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 10 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { font: { size: 10 }, callback: v => `₹${(v/1000).toFixed(1)}k Cr` },
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Revenue Trend (₹ Cr)</span>
        <span className="chart-card-sub">Last {selectedYears} years</span>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 180 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
