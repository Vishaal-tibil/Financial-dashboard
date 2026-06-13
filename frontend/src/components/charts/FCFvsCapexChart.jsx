import { Bubble } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'
import { fyLabel, getWindowVal } from '../../utils/fy'

function shortName(name) {
  const first = (name || '').split(' ')[0]
  return first.charAt(0) + first.slice(1).toLowerCase()
}

const labelPlugin = {
  id: 'bubbleNames',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i)
      if (!meta.visible) return
      meta.data.forEach((el, j) => {
        const r = ds.data[j]?.r ?? 10
        ctx.save()
        ctx.font      = 'bold 9.5px Inter, system-ui, sans-serif'
        ctx.fillStyle = '#334155'
        ctx.textAlign = 'center'
        ctx.fillText(ds.label, el.x, el.y - r - 5)
        ctx.restore()
      })
    })
  },
}

export default function CapitalEfficiencyScatter() {
  const { companies, metrics, primaryCompany, selectedCompanies, selectedYears, selectedFY } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  const primaryM = metrics[primaryCompany] || {}
  const allYears = selectedFY
    ? [selectedFY]
    : (primaryM.years || []).slice(-selectedYears)
  const displayYear = allYears.length ? fyLabel(allYears[allYears.length - 1]) : 'Latest'

  const ebitdaVals = visible.map(c => {
    const margin = getWindowVal(metrics, c.name, 'ebitda_margin', allYears)
    const sales  = getWindowVal(metrics, c.name, 'sales',         allYears)
    return (margin != null && sales != null) ? (margin / 100) * sales : 0
  })
  const maxE   = Math.max(...ebitdaVals, 1)
  const radius = v => Math.max(8, Math.round((v / maxE) * 22))

  const datasets = visible.map((c, i) => {
    const fcf   = getWindowVal(metrics, c.name, 'fcf',   allYears)
    const capex = getWindowVal(metrics, c.name, 'capex', allYears)
    return {
      label:           shortName(c.name),
      data:            [{ x: capex, y: fcf, r: radius(ebitdaVals[i]) }],
      backgroundColor: `${c.color}99`,
      borderColor:     c.color,
      borderWidth:     2,
    }
  })

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: {
        label: ctx => {
          const { x, y } = ctx.raw
          return [`CapEx: ₹${x?.toFixed(0)} Cr`, `FCF:   ₹${y?.toFixed(0)} Cr`]
        },
        title: items => items[0]?.dataset?.label ?? '',
      }},
    },
    scales: {
      x: {
        title: { display: true, text: 'CapEx (₹ Cr)', font: { size: 10 }, color: '#64748b' },
        grid:  { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, callback: v => `₹${v}` },
      },
      y: {
        title: { display: true, text: 'FCF (₹ Cr)', font: { size: 10 }, color: '#64748b' },
        grid:  { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, callback: v => `₹${v}` },
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Capital Efficiency — FCF vs CapEx</span>
        <span className="chart-card-sub">{displayYear} · Bubble size = EBITDA</span>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 230 }}>
        <Bubble data={{ datasets }} options={options} plugins={[labelPlugin]} />
      </div>
    </div>
  )
}
