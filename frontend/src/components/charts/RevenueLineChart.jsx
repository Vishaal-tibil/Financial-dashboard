import { useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'
import { fyLabel, parseQLabel } from '../../utils/fy'

const BAR_OPTS = {
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 10 } } },
    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ₹${(ctx.parsed.y / 1000).toFixed(2)}k Cr` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: {
      grid:  { color: 'rgba(0,0,0,0.06)' },
      ticks: { font: { size: 10 }, callback: v => `₹${(v / 1000).toFixed(1)}k Cr` },
    },
  },
}

export default function RevenueLineChart() {
  const {
    metrics, companies, primaryCompany, selectedCompanies,
    selectedYears, selectedFY, selectedQuarter,
  } = useApp()
  const [mode, setMode] = useState('absolute')

  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))
  const primaryM     = metrics[primaryCompany] || {}

  // ── FY-specific mode ─────────────────────────────────────────────────────────
  if (selectedFY) {
    const qLabels = primaryM.q_labels || []

    // Quarters of this FY, sorted Q1→Q4
    const fyQs = qLabels
      .map((lbl, i) => { const p = parseQLabel(lbl); return { ...p, rawIdx: i } })
      .filter(q => q.fyEndYear === selectedFY)
      .sort((a, b) => a.quarter - b.quarter)

    const hasQ     = fyQs.length > 0
    const activeQs = (hasQ && selectedQuarter)
      ? fyQs.filter(q => q.quarter === selectedQuarter)
      : fyQs

    if (hasQ) {
      // ── Quarterly bar chart ───────────────────────────────────────────────
      const xLabels = activeQs.map(q => `Q${q.quarter}`)
      const datasets = visible.map(c => {
        const cm = metrics[c.name] || {}
        const cqL = cm.q_labels || []
        const cqS = cm.q_sales  || []
        const data = activeQs.map(fq => {
          const idx = cqL.findIndex(l => {
            const p = parseQLabel(l)
            return p.fyEndYear === selectedFY && p.quarter === fq.quarter
          })
          return idx !== -1 ? cqS[idx] : null
        })
        return {
          label:           c.name,
          data,
          backgroundColor: `${c.color}bb`,
          borderColor:     c.color,
          borderWidth:     1.5,
          borderRadius:    4,
        }
      })

      const title = selectedQuarter
        ? `Revenue — ${fyLabel(selectedFY)} Q${selectedQuarter}`
        : `Revenue — ${fyLabel(selectedFY)} by Quarter`

      return (
        <div className="chart-card">
          <div className="chart-card-header">
            <span className="chart-card-title">{title}</span>
            <span className="chart-card-sub">₹ Crores</span>
          </div>
          <div className="chart-canvas-wrap" style={{ height: 180 }}>
            <Bar data={{ labels: xLabels, datasets }} options={BAR_OPTS} />
          </div>
        </div>
      )
    }

    // No quarterly data — single annual comparison bar
    const xLabels = visible.map(c => c.name.split(' ')[0])
    const datasets = [{
      label:           fyLabel(selectedFY),
      data:            visible.map(c => {
        const m   = metrics[c.name] || {}
        const idx = (m.years || []).indexOf(selectedFY)
        return idx !== -1 ? m.sales?.[idx] : null
      }),
      backgroundColor: visible.map(c => `${c.color}bb`),
      borderColor:     visible.map(c => c.color),
      borderWidth:     1.5,
      borderRadius:    4,
    }]

    return (
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-title">Revenue — {fyLabel(selectedFY)}</span>
          <span className="chart-card-sub">₹ Crores</span>
        </div>
        <div className="chart-canvas-wrap" style={{ height: 180 }}>
          <Bar data={{ labels: xLabels, datasets }} options={{ ...BAR_OPTS, plugins: { ...BAR_OPTS.plugins, legend: { display: false } } }} />
        </div>
      </div>
    )
  }

  // ── Range mode (time-series line) ─────────────────────────────────────────
  const allYears = (primaryM.years || []).slice(-selectedYears)

  const limitedNames = visible
    .filter(c => {
      const m    = metrics[c.name] || {}
      const yIdx = (m.years || []).reduce((acc, y, i) => { acc[y] = i; return acc }, {})
      return allYears.filter(y => yIdx[y] !== undefined && m.sales?.[yIdx[y]] != null).length < 3
    })
    .map(c => c.name.split(' ')[0])

  const datasets = visible.map(c => {
    const m    = metrics[c.name] || {}
    const yIdx = (m.years || []).reduce((acc, y, i) => { acc[y] = i; return acc }, {})
    const rawVals = allYears.map(y => (yIdx[y] !== undefined ? m.sales?.[yIdx[y]] : null))
    const base = rawVals.find(v => v != null)
    const vals = mode === 'indexed' && base
      ? rawVals.map(v => v != null ? (v / base) * 100 : null)
      : rawVals
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
  const data      = { labels: allYears.map(y => fyLabel(y)), datasets }
  const options   = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 10 } } },
      tooltip: { callbacks: {
        label: ctx => isIndexed
          ? ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)} (indexed)`
          : ` ${ctx.dataset.label}: ₹${(ctx.parsed.y / 1000).toFixed(1)}k Cr`,
      }},
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
        <span className="chart-card-title">
          Revenue Trend
          {limitedNames.length > 0 && (
            <span title={`${limitedNames.join(', ')}: limited historical data available`} style={{
              marginLeft: 6, fontSize: 9, fontWeight: 500,
              color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle',
            }}>
              {limitedNames.join(', ')}: limited data
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {['absolute', 'indexed'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: mode === m ? 'var(--accent)' : 'var(--bg-secondary)',
              color:      mode === m ? '#fff'          : 'var(--text-muted)',
              fontWeight: mode === m ? 600              : 400,
              transition: 'background 0.15s',
            }}>
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
