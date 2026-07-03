import { Bubble } from 'react-chartjs-2'
import { Star } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { fyLabel } from '../../utils/fy'

const quadrantPlugin = {
  id: 'quadrantMatrix',
  afterDraw(chart) {
    const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart
    const mx    = x.getPixelForValue(chart._xMid)
    const my    = y.getPixelForValue(chart._yMid)
    const zeroX = x.getPixelForValue(0)
    const zeroY = y.getPixelForValue(0)

    ctx.save()

    // ── 1. Negative zone tints (only when axis actually goes negative) ─────────
    if (y.min < 0 && zeroY < bottom) {
      ctx.fillStyle = 'rgba(220,38,38,0.05)'
      ctx.fillRect(left, zeroY, right - left, bottom - zeroY)
    }
    if (x.min < 0 && zeroX > left) {
      ctx.fillStyle = 'rgba(100,116,139,0.04)'
      ctx.fillRect(left, top, zeroX - left, bottom - top)
    }

    // ── 2. Quadrant background tints ─────────────────────────────────────────
    ;[
      [left, top,  mx,    my,     'rgba(22,163,74,0.07)'  ],
      [mx,   top,  right, my,     'rgba(37,99,235,0.055)' ],
      [left, my,   mx,    bottom, 'rgba(100,116,139,0.04)'],
      [mx,   my,   right, bottom, 'rgba(220,38,38,0.055)' ],
    ].forEach(([x1, y1, x2, y2, bg]) => {
      ctx.fillStyle = bg
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
    })

    // ── 3. Zero baselines (solid, only when axis crosses zero) ────────────────
    ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'
    ctx.lineWidth   = 1.5
    if (y.min < 0 && zeroY >= top && zeroY <= bottom) {
      ctx.beginPath(); ctx.moveTo(left, zeroY); ctx.lineTo(right, zeroY); ctx.stroke()
    }
    if (x.min < 0 && zeroX >= left && zeroX <= right) {
      ctx.beginPath(); ctx.moveTo(zeroX, top); ctx.lineTo(zeroX, bottom); ctx.stroke()
    }

    // ── 4. Dashed quadrant dividers ───────────────────────────────────────────
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = 'rgba(37,99,235,0.28)'
    ctx.lineWidth   = 1.5
    ctx.beginPath(); ctx.moveTo(mx, top);   ctx.lineTo(mx, bottom); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(left, my);  ctx.lineTo(right, my);  ctx.stroke()
    ctx.setLineDash([])

    // ── 5. Corner labels (3 lines: descriptor · descriptor · Category name) ───
    const corners = [
      { l1: 'High Margin', l2: 'Low Capital',  l3: 'Best-in-Class',    accent: '#16a34a', tx: left + 8,  ty: top + 14,    align: 'left'  },
      { l1: 'High Margin', l2: 'High Capital', l3: 'Scale Leaders',    accent: '#2563eb', tx: right - 8, ty: top + 14,    align: 'right' },
      { l1: 'Low Margin',  l2: 'Low Capital',  l3: 'Niche Players',    accent: '#64748b', tx: left + 8,  ty: bottom - 28, align: 'left'  },
      { l1: 'Low Margin',  l2: 'High Capital', l3: 'Value Destroyers', accent: '#dc2626', tx: right - 8, ty: bottom - 28, align: 'right' },
    ]
    corners.forEach(({ l1, l2, l3, accent, tx, ty, align }) => {
      ctx.textAlign = align
      ctx.font      = '8px Inter,system-ui,sans-serif'
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.fillText(l1, tx, ty)
      ctx.fillText(l2, tx, ty + 11)
      ctx.font      = 'bold 8.5px Inter,system-ui,sans-serif'
      ctx.fillStyle = accent
      ctx.fillText(l3, tx, ty + 23)
    })

    // ── 6. Company names beside bubbles ───────────────────────────────────────
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i)
      if (!meta.visible) return
      meta.data.forEach(el => {
        const r     = el.options.radius ?? 10
        const words = ds.label.split(' ')
        const lineH = 13

        ctx.font      = 'bold 10px Inter,system-ui,sans-serif'
        ctx.fillStyle = ds.borderColor
        ctx.textAlign = 'left'

        words.forEach((word, wi) => {
          const offsetY = (wi - (words.length - 1) / 2) * lineH
          ctx.fillText(word, el.x + r + 6, el.y + offsetY + 3.5)
        })
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
  return 8 + ((rev - mn) / (mx - mn)) * 16
}

function generateInsight(visible, xMid, yMid) {
  const valid = visible.filter(c => c.op_margin != null && c.cap_employed != null && c.cap_employed > 0)
  if (!valid.length) return null

  const ranked = [...valid].sort(
    (a, b) => (b.op_margin / b.cap_employed) - (a.op_margin / a.cap_employed)
  )
  const best    = ranked[0]
  const primary = valid[0]
  const bestShort    = best.name.split(' ').slice(0, 2).join(' ')
  const primaryShort = primary.name.split(' ').slice(0, 2).join(' ')

  if (best.name === primary.name) {
    return `${bestShort} delivers the highest profitability for the capital employed, indicating superior capital allocation efficiency.`
  }

  const aboveMargin = (primary.op_margin ?? 0) > yMid
  const aboveCap    = (primary.cap_employed ?? 0) > xMid
  const quadrant    = aboveMargin
    ? (aboveCap ? 'Scale Leaders' : 'Best-in-Class')
    : (aboveCap ? 'Value Destroyers' : 'Niche Players')

  return `${bestShort} delivers the highest profitability per unit of capital employed. ${primaryShort} is positioned in the ${quadrant} quadrant.`
}

export default function QuadrantMatrix() {
  const { companies, primaryCompany, selectedCompanies, meta, metrics, selectedFY } = useApp()
  const latestFY     = selectedFY ? fyLabel(selectedFY) : (meta?.latest_year ? fyLabel(meta.latest_year) : 'Latest')
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const baseVisible  = companies.filter(c => visibleNames.includes(c.name))

  // Enrich with FY-specific values when a year filter is active
  const visible = baseVisible.map(c => {
    if (!selectedFY) return c
    const m   = metrics[c.name] || {}
    const yrs = m.years || []
    const idx = yrs.indexOf(selectedFY)
    return {
      ...c,
      op_margin:    idx !== -1 ? (m.op_margin?.[idx]    ?? null) : null,
      cap_employed: idx !== -1 ? (m.cap_employed?.[idx] ?? null) : null,
      wf_sales:     idx !== -1 ? (m.sales?.[idx]        ?? null) : null,
    }
  })

  const xVals = visible.map(c => c.cap_employed).filter(v => v != null)
  const yVals = visible.map(c => c.op_margin).filter(v => v != null)
  const revs  = visible.map(c => c.wf_sales ?? 0)

  const xMid = xVals.length ? median(xVals) : 5000
  const yMid = yVals.length ? median(yVals) : 15

  const datasets = visible.map((c, i) => ({
    label:                c.name.split(' ').slice(0, 2).join(' '),
    data:                 [{ x: c.cap_employed ?? 0, y: c.op_margin ?? 0, r: scaleBubble(revs[i], revs) }],
    backgroundColor:      `${c.color}cc`,
    borderColor:          c.color,
    borderWidth:          2,
    hoverBackgroundColor: c.color,
  }))

  // Axis ranges — start from 0 unless data goes negative
  const xRange  = xVals.length ? Math.max(Math.max(...xVals) - Math.min(...xVals), 500) : 500
  const yRange  = yVals.length ? Math.max(Math.max(...yVals) - Math.min(...yVals), 5)   : 5
  const xPad    = xRange * 0.18
  const yPad    = yRange * 0.22

  const xMinData = xVals.length ? Math.min(...xVals) : 0
  const yMinData = yVals.length ? Math.min(...yVals) : 0
  const xMin = xMinData >= 0 ? 0 : xMinData - xPad
  const xMax = (xVals.length ? Math.max(...xVals) : 0) + xPad
  const yMin = yMinData >= 0 ? 0 : yMinData - yPad
  const yMax = (yVals.length ? Math.max(...yVals) : 0) + yPad

  const insight = generateInsight(visible, xMid, yMid)

  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    layout: { padding: { right: 60 } },
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
        grid:  { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, callback: v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v },
        min:   xMin,
        max:   xMax,
      },
      y: {
        title: { display: true, text: 'EBIT Margin (%)', font: { size: 10 }, color: '#64748b' },
        grid:  { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, callback: v => `${v}%` },
        min:   yMin,
        max:   yMax,
      },
    },
  }

  return (
    <div className="chart-card">
      {/* Header */}
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">Capital Efficiency Matrix <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>({latestFY})</span></div>
          <div className="chart-card-sub" style={{ marginTop: 2 }}>Profitability vs Capital Employed Efficiency</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid #94a3b8', display: 'inline-block', flexShrink: 0 }} />
          Bubble Size = Revenue (₹ Cr)
        </div>
      </div>

      {/* Chart */}
      <div className="chart-canvas-wrap" style={{ height: 270 }}>
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

      {/* AI Insight */}
      {insight && (
        <div style={{
          marginTop: 12,
          padding: '9px 13px',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.18)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 9,
        }}>
          <Star size={13} style={{ color: '#7c3aed', fill: '#7c3aed', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            <strong style={{ color: '#7c3aed' }}>AI Insight: </strong>
            {insight}
          </p>
        </div>
      )}
    </div>
  )
}
