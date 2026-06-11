import { Scatter } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'

function shortName(name) {
  const first = (name || '').split(' ')[0]
  return first.charAt(0) + first.slice(1).toLowerCase()
}

// Draws quadrant lines, labels, and company name above each point
const quadrantPlugin = {
  id: 'quadrantMatrix',
  afterDraw(chart) {
    const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart
    const mx = x.getPixelForValue(x._midpoint)
    const my = y.getPixelForValue(y._midpoint)

    ctx.save()

    // Quadrant divider lines
    ctx.setLineDash([5, 4])
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(mx, top); ctx.lineTo(mx, bottom); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(left, my); ctx.lineTo(right, my); ctx.stroke()
    ctx.setLineDash([])

    // Quadrant background tints
    const quads = [
      { x1: mx, y1: top,    x2: right,  y2: my,     color: 'rgba(22,163,74,0.05)',   label: 'Stars',            sub: 'High Turn · High ROCE', tx: right - 6, ty: top + 14,    align: 'right' },
      { x1: left, y1: top,  x2: mx,     y2: my,     color: 'rgba(217,119,6,0.05)',   label: 'Capital Intensive', sub: 'Low Turn · High ROCE',  tx: left + 6,  ty: top + 14,    align: 'left'  },
      { x1: mx,  y1: my,    x2: right,  y2: bottom, color: 'rgba(37,99,235,0.05)',   label: 'Lean Operators',   sub: 'High Turn · Low ROCE',  tx: right - 6, ty: bottom - 6,  align: 'right' },
      { x1: left, y1: my,   x2: mx,     y2: bottom, color: 'rgba(220,38,38,0.05)',   label: 'Underperformers',  sub: 'Low Turn · Low ROCE',   tx: left + 6,  ty: bottom - 6,  align: 'left'  },
    ]

    quads.forEach(({ x1, y1, x2, y2, color, label, sub, tx, ty, align }) => {
      ctx.fillStyle = color
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1)

      ctx.textAlign = align
      ctx.fillStyle = 'rgba(0,0,0,0.32)'
      ctx.font      = 'bold 9px Inter, system-ui, sans-serif'
      ctx.fillText(label, tx, ty)
      ctx.font      = '8px Inter, system-ui, sans-serif'
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.fillText(sub, tx, ty + 11)
    })

    // Company name labels above each point
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i)
      if (!meta.visible) return
      meta.data.forEach(el => {
        ctx.font      = 'bold 9.5px Inter, system-ui, sans-serif'
        ctx.fillStyle = ds.borderColor
        ctx.textAlign = 'center'
        ctx.fillText(ds.label, el.x, el.y - 9)
      })
    })

    ctx.restore()
  },
}


export default function QuadrantMatrix() {
  const { companies, primaryCompany, selectedCompanies } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  const xVals = visible.map(c => c.asset_turn).filter(v => v != null)
  const yVals = visible.map(c => c.roce).filter(v => v != null)

  const xMid = xVals.length ? xVals.reduce((a, b) => a + b, 0) / xVals.length : 1
  const yMid = yVals.length ? yVals.reduce((a, b) => a + b, 0) / yVals.length : 10

  const datasets = visible.map(c => ({
    label:           shortName(c.name),
    data:            [{ x: c.asset_turn ?? 0, y: c.roce ?? 0 }],
    backgroundColor: `${c.color}cc`,
    borderColor:     c.color,
    borderWidth:     2,
    pointRadius:     8,
    pointHoverRadius: 10,
  }))

  const xPad = Math.max(...xVals, 1) * 0.15
  const yPad = Math.max(...yVals, 1) * 0.18

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title:  items => items[0]?.dataset?.label ?? '',
          label:  ctx => [`Asset Turnover: ${ctx.raw.x?.toFixed(2)}x`, `ROCE: ${ctx.raw.y?.toFixed(1)}%`],
        },
      },
    },
    scales: {
      x: {
        title:  { display: true, text: 'Asset Turnover (×)', font: { size: 10 }, color: '#64748b' },
        grid:   { color: 'rgba(0,0,0,0.04)' },
        ticks:  { font: { size: 10 }, callback: v => `${v.toFixed(1)}x` },
        min:    Math.max(0, Math.min(...xVals, 0) - xPad),
        max:    Math.max(...xVals, 1) + xPad,
        _midpoint: xMid,
      },
      y: {
        title:  { display: true, text: 'ROCE (%)', font: { size: 10 }, color: '#64748b' },
        grid:   { color: 'rgba(0,0,0,0.04)' },
        ticks:  { font: { size: 10 }, callback: v => `${v}%` },
        min:    Math.min(...yVals, 0) - yPad,
        max:    Math.max(...yVals, 1) + yPad,
        _midpoint: yMid,
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Capital Efficiency Matrix</span>
        <span className="chart-card-sub">Asset Turnover × ROCE — quadrant view</span>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 260 }}>
        <Scatter data={{ datasets }} options={options} plugins={[quadrantPlugin]} />
      </div>
    </div>
  )
}
