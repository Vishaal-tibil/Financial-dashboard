import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'

export default function RevenueLineChart() {
  const { metrics, companies, primaryCompany, selectedCompanies, selectedYears } = useApp()
  const [mode, setMode] = useState('absolute')  // 'absolute' | 'indexed'

  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  const primaryMetrics = metrics[primaryCompany] || {}
  const allYears       = (primaryMetrics.years || []).slice(-selectedYears)

  const datasets = visible.map(c => {
    const m    = metrics[c.name] || {}
    const yIdx = (m.years || []).reduce((acc, y, i) => { acc[y] = i; return acc }, {})
    const rawVals = allYears.map(y => (yIdx[y] !== undefined ? m.sales?.[yIdx[y]] : null))

    let vals = rawVals
    if (mode === 'indexed') {
      const base = rawVals.find(v => v != null)
      vals = base ? rawVals.map(v => v != null ? (v / base) * 100 : null) : rawVals
    }

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

  const isIndexed = mode === 'indexed'

  const data    = { labels: allYears.map(String), datasets }
  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 10 } } },
      tooltip: {
        callbacks: {
          label: ctx => isIndexed
            ? ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)} (indexed)`
            : ` ${ctx.dataset.label}: ₹${(ctx.parsed.y / 1000).toFixed(1)}k Cr`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        grid:  { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          font:     { size: 10 },
          callback: isIndexed ? v => `${v}` : v => `₹${(v / 1000).toFixed(1)}k Cr`,
        },
        ...(isIndexed ? { suggestedMin: 70 } : {}),
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Revenue Trend</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {['absolute', 'indexed'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                fontSize:     9,
                padding:      '2px 7px',
                borderRadius: 10,
                border:       'none',
                cursor:       'pointer',
                background:   mode === m ? 'var(--accent)' : 'var(--bg-secondary)',
                color:        mode === m ? '#fff'          : 'var(--text-muted)',
                fontWeight:   mode === m ? 600              : 400,
                transition:   'background 0.15s',
              }}
            >
              {m === 'absolute' ? '₹ Abs' : 'Indexed'}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 180 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
