import { Bubble } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'

// Quadrant lines + labels + company name above each bubble
const quadrantPlugin = {
  id: 'quadrantMatrix',
  afterDraw(chart) {
    const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart
    const mx = x.getPixelForValue(chart._xMid)
    const my = y.getPixelForValue(chart._yMid)

    ctx.save()

    // Divider lines
    ctx.setLineDash([5, 4])
    ctx.strokeStyle = 'rgba(0,0,0,0.13)'
    ctx.lineWidth   = 1
    ctx.beginPath(); ctx.moveTo(mx, top);   ctx.lineTo(mx, bottom); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(left, my);  ctx.lineTo(right, my);  ctx.stroke()
    ctx.setLineDash([])

    // Quadrant background tints + labels
    // Top-left:    High Margin / Low Capital  → Best-in-Class  (green)
    // Top-right:   High Margin / High Capital → Scale Leaders  (blue)
    // Bottom-left: Low Margin  / Low Capital  → Niche Players  (gray)
    // Bottom-right:Low Margin  / High Capital → Value Destroyers (red)
    const quads = [
      { x1: left, y1: top,  x2: mx,    y2: my,     bg: 'rgba(22,163,74,0.06)',  label: 'Best-in-Class',   sub: 'High Margin · Low Capital',  tx: left+7, ty: top+14,   align: 'left'  },
      { x1: mx,   y1: top,  x2: right, y2: my,     bg: 'rgba(37,99,235,0.05)', label: 'Scale Leaders',   sub: 'High Margin · High Capital', tx: right-6,ty: top+14,   align: 'right' },
      { x1: left, y1: my,   x2: mx,    y2: bottom, bg: 'rgba(100,116,139,0.04)',label: 'Niche Players',   sub: 'Low Margin · Low Capital',   tx: left+7, ty: bottom-6, align: 'left'  },
      { x1: mx,   y1: my,   x2: right, y2: bottom, bg: 'rgba(220,38,38,0.05)', label: 'Value Destroyers',sub: 'Low Margin · High Capital',   tx: right-6,ty: bottom-6, align: 'right' },
    ]

    quads.forEach(({ x1, y1, x2, y2, bg, label, sub, tx, ty, align }) => {
      ctx.fillStyle = bg
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
      ctx.textAlign  = align
      ctx.fillStyle  = 'rgba(0,0,0,0.30)'
      ctx.font       = 'bold 9px Inter,system-ui,sans-serif'
      ctx.fillText(label, tx, ty)
      ctx.fillStyle  = 'rgba(0,0,0,0.18)'
      ctx.font       = '8px Inter,system-ui,sans-serif'
      ctx.fillText(sub, tx, ty + 11)
    })

    // Company name above each bubble
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i)
      if (!meta.visible) return
      meta.data.forEach(el => {
        ctx.font      = 'bold 9.5px Inter,system-ui,sans-serif'
        ctx.fillStyle = ds.borderColor
        ctx.textAlign = 'center'
        ctx.fillText(ds.label, el.x, el.y - el.options.radius - 4)
      })
    })

    ctx.restore()
  },
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

function scaleBubble(rev, allRevs) {
  const mn = Math.min(...allRevs)
  const mx = Math.max(...allRevs)
  if (mx === mn) return 14
  return 8 + ((rev - mn) / (mx - mn)) * 16   // radius 8–24 px
}

export default function QuadrantMatrix() {
  const { companies, primaryCompany, selectedCompanies } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  const xVals  = visible.map(c => c.cap_employed).filter(v => v != null)
  const yVals  = visible.map(c => c.op_margin).filter(v => v != null)
  const revs   = visible.map(c => c.wf_sales   ?? 0)

  const xMid = xVals.length ? median(xVals) : 2000
  const yMid = yVals.length ? median(yVals) : 10

  const datasets = visible.map((c, i) => ({
    label:            c.name.split(' ')[0],
    data:             [{ x: c.cap_employed ?? 0, y: c.op_margin ?? 0, r: scaleBubble(revs[i], revs) }],
    backgroundColor:  `${c.color}bb`,
    borderColor:      c.color,
    borderWidth:      2,
    hoverBackgroundColor: c.color,
  }))

  const xPad = Math.max(...xVals, 500) * 0.18
  const yPad = Math.max(...yVals, 5)   * 0.22

  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: items => items[0]?.dataset?.label ?? '',
          label: ctx => [
            `Capital Employed: ₹${ctx.raw.x?.toFixed(0)} Cr`,
            `EBIT Margin: ${ctx.raw.y?.toFixed(1)}%`,
            `Revenue: ₹${(visible[ctx.datasetIndex]?.wf_sales ?? 0).toFixed(0)} Cr`,
          ],
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Capital Employed (₹ Cr)', font: { size: 10 }, color: '#64748b' },
        grid:  { color: 'rgba(0,0,0,0.04)' },
        ticks: { font: { size: 10 }, callback: v => `₹${(v/1000).toFixed(1)}k` },
        min:   Math.max(0, Math.min(...xVals) - xPad),
        max:   Math.max(...xVals) + xPad,
      },
      y: {
        title: { display: true, text: 'EBIT Margin (%)', font: { size: 10 }, color: '#64748b' },
        grid:  { color: 'rgba(0,0,0,0.04)' },
        ticks: { font: { size: 10 }, callback: v => `${v}%` },
        min:   Math.min(...yVals) - yPad,
        max:   Math.max(...yVals) + yPad,
      },
    },
  }

  // Store midpoints on options for the plugin to read
  options._xMid = xMid
  options._yMid = yMid

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Capital Efficiency Matrix</span>
        <span className="chart-card-sub">Cap. Employed × EBIT Margin — bubble = Revenue</span>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 260 }}>
        <Bubble
          data={{ datasets }}
          options={options}
          plugins={[{
            ...quadrantPlugin,
            afterDraw(chart) {
              chart._xMid = xMid
              chart._yMid = yMid
              quadrantPlugin.afterDraw(chart)
            },
          }]}
        />
      </div>
    </div>
  )
}
