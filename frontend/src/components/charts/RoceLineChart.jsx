import { Line, Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'
import { fyLabel } from '../../utils/fy'

export default function RoceLineChart() {
  const {
    metrics, companies, primaryCompany, selectedCompanies,
    selectedYears, selectedFY, selectedQuarter,
  } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))
  const primaryM     = metrics[primaryCompany] || {}

  // ── FY-specific mode: cross-sectional bar comparing companies ────────────
  if (selectedFY) {
    const xLabels = visible.map(c => c.name.split(' ')[0])
    const datasets = [{
      label:           `ROCE — ${fyLabel(selectedFY)}`,
      data:            visible.map(c => {
        const m   = metrics[c.name] || {}
        const idx = (m.years || []).indexOf(selectedFY)
        return idx !== -1 ? m.roce?.[idx] : null
      }),
      backgroundColor: visible.map(c => `${c.color}bb`),
      borderColor:     visible.map(c => c.color),
      borderWidth:     1.5,
      borderRadius:    4,
    }]

    return (
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-title">ROCE — {fyLabel(selectedFY)}</span>
          {selectedQuarter && (
            <span className="chart-card-sub">Annual data (quarterly ROCE not available)</span>
          )}
        </div>
        <div className="chart-canvas-wrap" style={{ height: 200 }}>
          <Bar
            data={{ labels: xLabels, datasets }}
            options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.y?.toFixed(1)}%` } },
              },
              scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: {
                  grid:  { color: 'rgba(0,0,0,0.06)' },
                  ticks: { font: { size: 10 }, callback: v => `${v}%` },
                },
              },
            }}
          />
        </div>
      </div>
    )
  }

  // ── Range mode: time-series line ─────────────────────────────────────────
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

  const data    = { labels: allYears.map(y => fyLabel(y)), datasets }
  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 10 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        grid:  { color: 'rgba(0,0,0,0.06)' },
        ticks: { font: { size: 10 }, callback: v => `${v}%` },
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Return on Capital Employed — ROCE (%)</span>
        <span className="chart-card-sub">Last {selectedYears} FY</span>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 200 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
