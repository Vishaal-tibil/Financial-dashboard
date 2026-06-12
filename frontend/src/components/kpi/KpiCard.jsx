import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function fmt(value, unit) {
  if (value == null) return '—'
  const n = Number(value)
  if (unit === '%')   return `${n.toFixed(1)}%`
  if (unit === 'x')   return `${n.toFixed(2)}x`
  if (unit === 'days') return `${Math.round(n)} Days`
  if (unit === 'cr')  return `₹${n.toFixed(0)} Cr`
  return n.toFixed(1)
}

// trend: +1 = improved YoY (green up), -1 = worsened (red down), 0 = flat/unknown
export default function KpiCard({ label, value, unit, rank, rankOf, trend }) {
  const isUp   = trend === 1
  const isDown = trend === -1

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{fmt(value, unit)}</div>
      <div className="kpi-footer">
        <span className="kpi-rank">
          {rank != null ? `Rank #${rank} of ${rankOf ?? '—'}` : '—'}
        </span>
        {trend != null && (
          <span className={`kpi-trend ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
            {isUp   ? <TrendingUp  size={12} /> : null}
            {isDown ? <TrendingDown size={12} /> : null}
            {!isUp && !isDown ? <Minus size={12} /> : null}
          </span>
        )}
      </div>
    </div>
  )
}
