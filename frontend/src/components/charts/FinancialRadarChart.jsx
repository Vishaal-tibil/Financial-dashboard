import { Radar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'

const AXES = [
  { key: 'ebitda_margin', label: 'EBITDA %'    },
  { key: 'roce',          label: 'ROCE %'       },
  { key: 'net_margin',    label: 'Net Margin %' },
  { key: 'asset_turn',    label: 'Asset Turn'   },
  { key: 'roe',           label: 'ROE %'        },
  { key: 'rev_growth',    label: 'Rev Growth %' },
]

function normalise(val, min, max) {
  if (val == null || max === min) return 50
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100))
}

export default function FinancialRadarChart() {
  const { companies, primaryCompany, selectedCompanies } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  // Normalise each axis across visible companies
  const ranges = AXES.map(({ key }) => {
    const vals = visible.map(c => c[key]).filter(v => v != null)
    return { min: Math.min(...vals), max: Math.max(...vals) }
  })

  const datasets = visible.map(c => ({
    label: c.name,
    data:  AXES.map(({ key }, i) => normalise(c[key], ranges[i].min, ranges[i].max)),
    borderColor:     c.color,
    backgroundColor: `${c.color}22`,
    pointBackgroundColor: c.color,
    pointRadius: 3,
    borderWidth: 2,
  }))

  const data    = { labels: AXES.map(a => a.label), datasets }
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { display: false },
        grid:       { color: 'rgba(255,255,255,0.06)' },
        angleLines: { color: 'rgba(255,255,255,0.06)' },
        pointLabels: { color: '#94a3b8', font: { size: 10 } },
      },
    },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 10 } } } },
  }

  if (!visible.length) return <div className="chart-card" style={{ height: 260, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:12 }}>No data</div>

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Financial Trend — Radar (7yr)</span>
        <span className="chart-card-sub">Normalised across peers</span>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 220 }}>
        <Radar data={data} options={options} />
      </div>
    </div>
  )
}
