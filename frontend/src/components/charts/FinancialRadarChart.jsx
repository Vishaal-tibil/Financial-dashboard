import { Radar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'
import { fyLabel, getWindowVal } from '../../utils/fy'

const AXES = [
  { key: 'ebitda_margin', label: 'EBITDA %',    invert: false },
  { key: 'roce',          label: 'ROCE %',       invert: false },
  { key: 'net_margin',    label: 'Net Margin %', invert: false },
  { key: 'asset_turn',    label: 'Asset Turn',   invert: false },
  { key: 'roe',           label: 'ROE %',        invert: false },
  { key: 'cfo_to_sales',  label: 'CFO/Sales %',  invert: false },
  { key: 'debt_equity',   label: 'Debt/Equity',  invert: true  },
]

function normalise(val, min, max, invert) {
  if (val == null || max === min) return 50
  const n = ((val - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, invert ? 100 - n : n))
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

function bestPeer(peers, all, ranges) {
  if (!peers.length) return null
  return peers.reduce((best, c) => {
    const score = b => AXES.reduce((s, { key, invert }, i) =>
      s + normalise(b[key], ranges[i].min, ranges[i].max, invert), 0)
    return score(c) > score(best) ? c : best
  }, peers[0])
}

export default function FinancialRadarChart() {
  const { companies, metrics, primaryCompany, selectedYears, selectedFY } = useApp()

  const primaryM = metrics[primaryCompany] || {}
  const allYears = selectedFY
    ? [selectedFY]
    : (primaryM.years || []).slice(-selectedYears)

  // Resolve a metric value for a company at the current filter (FY or window)
  function getVal(companyName, key) {
    return getWindowVal(metrics, companyName, key, allYears)
  }

  // Build enriched company objects with metric values for the current FY/window
  const enriched = companies.map(c => ({
    ...c,
    ...Object.fromEntries(AXES.map(({ key }) => [key, getVal(c.name, key)])),
  }))

  const primary = enriched.find(c => c.name === primaryCompany)
  const peers   = enriched.filter(c => c.name !== primaryCompany)

  const ranges = AXES.map(({ key }) => {
    const vals = enriched.map(c => c[key]).filter(v => v != null)
    return { min: Math.min(...vals), max: Math.max(...vals) }
  })

  const best = bestPeer(peers, enriched, ranges)

  const medianNorm = AXES.map(({ key, invert }, i) => {
    const vals = enriched.map(c => c[key]).filter(v => v != null)
    return vals.length ? normalise(median(vals), ranges[i].min, ranges[i].max, invert) : 50
  })

  const pair = [primary, best].filter(Boolean)

  const datasets = [
    primary && {
      label:                primary.name.split(' ')[0],
      data:                 AXES.map(({ key, invert }, i) => normalise(primary[key], ranges[i].min, ranges[i].max, invert)),
      borderColor:          '#2563EB',
      backgroundColor:      'rgba(37,99,235,0.15)',
      pointBackgroundColor: '#2563EB',
      pointRadius:          4,
      pointHoverRadius:     6,
      borderWidth:          2.5,
      order:                0,
    },
    best && {
      label:                `Best: ${best.name.split(' ')[0]}`,
      data:                 AXES.map(({ key, invert }, i) => normalise(best[key], ranges[i].min, ranges[i].max, invert)),
      borderColor:          '#16a34a',
      backgroundColor:      'rgba(22,163,74,0.06)',
      pointBackgroundColor: '#16a34a',
      pointRadius:          3,
      pointHoverRadius:     5,
      borderWidth:          2,
      borderDash:           [5, 4],
      order:                1,
    },
    {
      label:                'Industry Median',
      data:                 medianNorm,
      borderColor:          '#94a3b8',
      backgroundColor:      'rgba(148,163,184,0.04)',
      pointBackgroundColor: '#94a3b8',
      pointRadius:          2,
      pointHoverRadius:     4,
      borderWidth:          1.5,
      borderDash:           [3, 3],
      order:                2,
    },
  ].filter(Boolean)

  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0, max: 100,
        ticks:       { display: false },
        grid:        { color: 'rgba(0,0,0,0.07)' },
        angleLines:  { color: 'rgba(0,0,0,0.07)' },
        pointLabels: { color: '#64748b', font: { size: 8, weight: '500' }, padding: 6 },
      },
    },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 9 } } },
      tooltip: { callbacks: {
        label: ctx => {
          if (ctx.datasetIndex === 2) {
            const { key } = AXES[ctx.dataIndex]
            const vals = enriched.map(c => c[key]).filter(v => v != null)
            const med  = vals.length ? median(vals) : null
            return med != null ? ` Industry Median: ${Number(med).toFixed(2)}` : ` Industry Median: —`
          }
          const c    = pair[ctx.datasetIndex]
          const axis = AXES[ctx.dataIndex]
          const raw  = c?.[axis.key]
          return raw != null ? ` ${axis.label}: ${Number(raw).toFixed(2)}` : ` ${axis.label}: —`
        },
      }},
    },
  }

  const subtitle = selectedFY
    ? `${fyLabel(selectedFY)} · vs Best Peer + Industry Median`
    : 'vs Best Peer + Industry Median — normalised 0–100'

  if (!primary) return (
    <div className="chart-card" style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
      No data
    </div>
  )

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Financial Health Radar</span>
        <span className="chart-card-sub">{subtitle}</span>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 310 }}>
        <Radar data={{ labels: AXES.map(a => a.label), datasets }} options={options} />
      </div>
    </div>
  )
}
