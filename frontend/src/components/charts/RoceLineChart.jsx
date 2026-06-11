import { Line } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'

export default function RoceLineChart() {
  const { metrics, companies, primaryCompany, selectedCompanies, selectedYears } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  const primaryM = metrics[primaryCompany] || {}
  const allYears = (primaryM.years || []).slice(-selectedYears)

  const datasets = visible.map(c => {
    const m    = metrics[c.name] || {}
    const yIdx = (m.years || []).reduce((acc, y, i) => { acc[y] = i; return acc }, {})
    const vals = allYears.map(y => (yIdx[y] !== undefined ? m.roce?.[yIdx[y]] : null))
    return {
      label:            c.name,
      data:             vals,
      borderColor:      c.color,
      backgroundColor:  `${c.color}18`,
      tension:          0.35,
      pointRadius:      3,
      pointHoverRadius: 5,
      borderWidth:      2,
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
        ticks: { font: { size: 10 }, callback: v => `${v}%` },
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Return on Capital Employed — ROCE (%)</span>
        <span className="chart-card-sub">Last {selectedYears} years</span>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 200 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
