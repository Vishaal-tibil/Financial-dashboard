import { useState } from 'react'
import { useApp } from '../../context/AppContext'

const METRIC_OPTIONS = [
  { key: 'ebitda_margin', label: 'EBITDA Margin %' },
  { key: 'roce',          label: 'ROCE %'           },
  { key: 'net_margin',    label: 'Net Margin %'     },
  { key: 'asset_turn',    label: 'Asset Turnover'   },
  { key: 'inv_days',      label: 'Inventory Days'   },
  { key: 'ccc',           label: 'Cash Conv. Cycle' },
]

function heatColor(pct) {
  // blue (low) → green (mid) → amber (high)
  if (pct < 0.33) return `rgba(76,158,235,${0.4 + pct * 1.2})`
  if (pct < 0.66) return `rgba(46,196,182,${0.5 + pct * 0.6})`
  return `rgba(251,191,36,${0.5 + pct * 0.5})`
}

export default function HiddenPatternsHeatmap() {
  const { metrics, companies, primaryCompany, selectedCompanies, selectedYears } = useApp()
  const [metricKey, setMetricKey] = useState('ebitda_margin')

  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  const primaryM = metrics[primaryCompany] || {}
  const allYears = (primaryM.years || []).slice(-selectedYears)

  // Collect all values for normalisation
  const allVals = visible.flatMap(c => {
    const m    = metrics[c.name] || {}
    const yIdx = (m.years || []).reduce((acc, y, i) => { acc[y] = i; return acc }, {})
    return allYears.map(y => (yIdx[y] !== undefined ? m[metricKey]?.[yIdx[y]] : null)).filter(v => v != null)
  })
  const mn = Math.min(...allVals), mx = Math.max(...allVals)

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Hidden Patterns — Heatmap</span>
        <select
          value={metricKey}
          onChange={e => setMetricKey(e.target.value)}
          style={{
            background: 'var(--bg-base)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 5, padding: '3px 8px',
            fontSize: 11, cursor: 'pointer',
          }}
        >
          {METRIC_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      <div className="heatmap-wrap">
        {/* Year header */}
        <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(${allYears.length}, 1fr)`, gap: 3, marginBottom: 3 }}>
          <div />
          {allYears.map(y => (
            <div key={y} className="heatmap-label" style={{ justifyContent: 'center', fontSize: 9 }}>{y}</div>
          ))}
        </div>

        {/* Company rows */}
        {visible.map(c => {
          const m    = metrics[c.name] || {}
          const yIdx = (m.years || []).reduce((acc, y, i) => { acc[y] = i; return acc }, {})
          return (
            <div
              key={c.name}
              style={{ display: 'grid', gridTemplateColumns: `100px repeat(${allYears.length}, 1fr)`, gap: 3, marginBottom: 3 }}
            >
              <div className="heatmap-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                {c.name.split(' ')[0]}
              </div>
              {allYears.map(y => {
                const idx = yIdx[y]
                const val = idx !== undefined ? m[metricKey]?.[idx] : null
                const pct = (val != null && mx !== mn) ? (val - mn) / (mx - mn) : 0
                return (
                  <div
                    key={y}
                    className="heatmap-cell"
                    style={{ background: val != null ? heatColor(pct) : 'rgba(255,255,255,0.03)' }}
                    title={`${c.name} ${y}: ${val != null ? val.toFixed(1) : '—'}`}
                  >
                    {val != null ? val.toFixed(1) : ''}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
