import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useCountUp } from '../../hooks/useCountUp'

function fmt(value, unit) {
  if (value == null) return '—'
  const n = Number(value)
  if (unit === '%')    return `${n.toFixed(1)}%`
  if (unit === 'x')    return `${n.toFixed(2)}x`
  if (unit === 'days') return `${Math.round(n)} Days`
  if (unit === 'cr')   return `₹${n.toFixed(0)} Cr`
  return n.toFixed(1)
}

export default function KpiCard({ label, value, unit, rank, rankOf, trend }) {
  const numericTarget = value != null ? Number(value) : null
  const animated      = useCountUp(numericTarget)

  const prevRef    = useRef(numericTarget)
  const [flashCls, setFlashCls] = useState('')

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = numericTarget

    if (prev == null || numericTarget == null || prev === numericTarget) return

    // Use trend direction when available; fall back to raw numeric delta
    const dir = trend != null
      ? trend
      : numericTarget > prev ? 1 : numericTarget < prev ? -1 : 0

    if (dir === 0) return
    const cls = dir === 1 ? 'kpi-value-flash-up' : 'kpi-value-flash-down'
    setFlashCls(cls)
    const id = setTimeout(() => setFlashCls(''), 650)
    return () => clearTimeout(id)
  }, [numericTarget, trend])

  const isUp   = trend === 1
  const isDown = trend === -1

  return (
    <div className={`kpi-card${flashCls ? ` ${flashCls}` : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{fmt(animated, unit)}</div>
      <div className="kpi-footer">
        <span className="kpi-rank">
          {rank != null ? `Rank #${rank} of ${rankOf ?? '—'}` : '—'}
        </span>
        {trend != null && (
          <span className={`kpi-trend ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
            {isUp   ? <TrendingUp   size={12} /> : null}
            {isDown ? <TrendingDown size={12} /> : null}
            {!isUp && !isDown ? <Minus size={12} /> : null}
          </span>
        )}
      </div>
    </div>
  )
}
