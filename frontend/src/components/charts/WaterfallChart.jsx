import { Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'

function fmtCr(v) {
  if (v == null || isNaN(v)) return '—'
  return `₹${Math.abs(v).toFixed(0)} Cr`
}

// Custom plugin to draw EBITDA reference line and net profit label
const waterfallPlugin = {
  id: 'waterfallAnnotations',
  afterDraw(chart) {
    const { ctx, data, scales: { y, x } } = chart
    const ebitdaVal = chart._ebitda
    const ebitVal   = chart._ebit
    if (!ebitdaVal && !ebitVal) return

    ctx.save()
    ctx.setLineDash([4, 3])
    ctx.lineWidth = 1

    // EBITDA reference line
    if (ebitdaVal != null) {
      const py = y.getPixelForValue(ebitdaVal)
      ctx.strokeStyle = '#2EC4B6'
      ctx.beginPath()
      ctx.moveTo(x.left, py)
      ctx.lineTo(x.right, py)
      ctx.stroke()
      ctx.fillStyle = '#2EC4B6'
      ctx.font = 'bold 9px Inter, system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(`EBITDA ${fmtCr(ebitdaVal)}`, x.right - 2, py - 3)
    }

    // EBIT reference line
    if (ebitVal != null) {
      const py2 = y.getPixelForValue(ebitVal)
      ctx.strokeStyle = '#0891b2'
      ctx.beginPath()
      ctx.moveTo(x.left, py2)
      ctx.lineTo(x.right, py2)
      ctx.stroke()
      ctx.fillStyle = '#0891b2'
      ctx.font = 'bold 9px Inter, system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(`EBIT ${fmtCr(ebitVal)}`, x.right - 2, py2 - 3)
    }

    ctx.restore()
  },
}

export default function WaterfallChart() {
  const { companies, primaryCompany, selectedCompanies } = useApp()
  const primary = companies.find(c => c.name === primaryCompany)

  if (!primary || !primary.wf_sales) {
    return (
      <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', fontSize: 12 }}>
        No P&L data available
      </div>
    )
  }

  const rev  = primary.wf_sales      ?? 0
  const rm   = primary.wf_raw_mat    ?? 0
  const emp  = primary.wf_emp_cost   ?? 0
  const opex = primary.wf_other_opex ?? 0   // chg_inv + power + other_mfr + selling + other_exp
  const dep  = primary.wf_deprec     ?? 0
  const int_ = primary.wf_interest   ?? 0
  const tax  = primary.wf_tax        ?? 0

  // In our data: rev - rm - emp - opex = EBIT (depreciation is already excluded from opex)
  // EBITDA = EBIT + depreciation (adding back non-cash D&A)
  const ebit   = rev - rm - emp - opex
  const ebitda = ebit + dep            // EBITDA = EBIT + D&A add-back
  const pbt    = ebit - int_
  const net    = pbt - tax

  // Waterfall: show revenue → cash expense deductions → EBIT → interest → tax → net profit
  // Each entry: [low, high] for floating bar; type=total renders from 0
  const steps = [
    { label: 'Revenue',     lo: 0,          hi: rev,           color: '#4C9EEB', type: 'total'    },
    { label: '−Materials',  lo: rev - rm,   hi: rev,           color: '#E76F51', type: 'decrease' },
    { label: '−Emp Cost',   lo: rev-rm-emp, hi: rev - rm,      color: '#F4A261', type: 'decrease' },
    { label: '−Other OpEx', lo: ebit,       hi: rev-rm-emp,    color: '#F4A261', type: 'decrease' },
    { label: 'EBIT',        lo: 0,          hi: ebit,          color: '#0891b2', type: 'subtotal' },
    ...(int_ > 0 ? [{ label: '−Interest', lo: ebit-int_, hi: ebit, color: '#9b59b6', type: 'decrease' }] : []),
    ...(tax  > 0 ? [{ label: '−Tax',      lo: net,       hi: pbt,  color: '#9b59b6', type: 'decrease' }] : []),
    { label: 'Net Profit',  lo: 0,          hi: net,           color: net >= 0 ? '#16a34a' : '#dc2626', type: 'total' },
  ]

  const labels    = steps.map(s => s.label)
  const floatData = steps.map(s => [Math.min(s.lo, s.hi), Math.max(s.lo, s.hi)])
  const bgColors  = steps.map(s => s.color + (s.type !== 'decrease' ? 'ee' : '88'))
  const bdrColors = steps.map(s => s.color)

  const datasets = [{
    label:           'P&L Bridge',
    data:            floatData,
    backgroundColor: bgColors,
    borderColor:     bdrColors,
    borderWidth:     1.5,
    borderRadius:    3,
    barPercentage:   0.72,
  }]

  const yMin = Math.min(0, net) * 1.1
  const yMax = rev * 1.08

  const options = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: items => items[0]?.label,
          label: ctx => {
            const [lo, hi] = ctx.raw
            return fmtCr(hi - lo)
          },
        },
      },
    },
    scales: {
      x: {
        grid:  { display: false },
        ticks: { font: { size: 9 }, color: '#64748b' },
      },
      y: {
        grid:  { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, callback: v => `₹${(v/1000).toFixed(1)}k` },
        min:   yMin,
        max:   yMax,
      },
    },
  }

  // Peer comparison
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const peers = companies.filter(c => visibleNames.includes(c.name) && c.name !== primaryCompany)

  const chartRef = { _ebitda: ebitda, _ebit: ebit }

  // Pass EBITDA/EBIT values to plugin via data extension
  const chartWithMeta = {
    ...{ labels, datasets },
    _ebitda: ebitda,
    _ebit:   ebit,
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">P&L Waterfall Bridge</span>
        <span className="chart-card-sub">{primary.name.split(' ')[0]} — FY{String((primary.latest_year || 1) - 1).slice(2)}</span>
      </div>

      {/* EBITDA summary pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(46,196,182,0.12)', color: '#2EC4B6', borderRadius: 100, fontWeight: 700 }}>
          EBITDA {fmtCr(ebitda)} ({primary.ebitda_margin?.toFixed(1)}%)
        </span>
        <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(8,145,178,0.12)', color: '#0891b2', borderRadius: 100, fontWeight: 700 }}>
          EBIT {fmtCr(ebit)} ({primary.op_margin?.toFixed(1)}%)
        </span>
        <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(22,163,74,0.12)', color: '#16a34a', borderRadius: 100, fontWeight: 700 }}>
          Net {fmtCr(net)} ({primary.net_margin?.toFixed(1)}%)
        </span>
      </div>

      <div className="chart-canvas-wrap" style={{ height: 200 }}>
        <Bar
          data={{ labels, datasets }}
          options={options}
          plugins={[{
            id: 'waterfallAnnotations',
            afterDraw(chart) {
              const { ctx, scales: { y, x } } = chart
              ctx.save()
              ctx.setLineDash([4, 3])
              ctx.lineWidth = 1
              // EBITDA line
              const py = y.getPixelForValue(ebitda)
              ctx.strokeStyle = '#2EC4B6'
              ctx.beginPath(); ctx.moveTo(x.left, py); ctx.lineTo(x.right, py); ctx.stroke()
              ctx.fillStyle = '#2EC4B6'; ctx.font = 'bold 8.5px Inter, system-ui'; ctx.textAlign = 'left'
              ctx.fillText(`EBITDA`, x.left + 4, py - 3)
              // EBIT line
              const py2 = y.getPixelForValue(ebit)
              ctx.strokeStyle = '#94a3b8'
              ctx.beginPath(); ctx.moveTo(x.left, py2); ctx.lineTo(x.right, py2); ctx.stroke()
              ctx.restore()
            },
          }]}
        />
      </div>

      {/* Peer margin comparison */}
      {peers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>EBITDA Margin:</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#2EC4B6' }}>
            {primary.name.split(' ')[0]}: {primary.ebitda_margin?.toFixed(1)}%
          </span>
          {peers.map(p => (
            <span key={p.name} style={{ fontSize: 10, color: p.color, fontWeight: 600 }}>
              {p.name.split(' ')[0]}: {p.ebitda_margin?.toFixed(1)}%
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
