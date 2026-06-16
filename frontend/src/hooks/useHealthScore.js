import { useApp } from '../context/AppContext'

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function norm(val, low, high) {
  if (val == null) return null
  return clamp((val - low) / (high - low), 0, 1)
}

export const HEALTH_TIERS = {
  thriving: { label: 'Strong',  strip: '#0d9488', accent: '#0d9488' },
  stable:   { label: 'Stable',  strip: '#2563eb', accent: '#2563eb' },
  caution:  { label: 'Caution', strip: '#d97706', accent: '#d97706' },
  concern:  { label: 'Watch',   strip: '#dc2626', accent: '#ea580c' },
}

export function computeHealth({ ebitda_margin, roce, rev_growth, debt_equity } = {}) {
  let score = 0, total = 0

  function add(val, lo, hi, w) {
    const n = norm(val, lo, hi)
    if (n != null) { score += n * w; total += w }
  }

  add(ebitda_margin, 5,   22,  35)
  add(roce,          5,   22,  30)
  add(rev_growth,    -10, 20,  20)
  add(debt_equity != null ? 2 - debt_equity : null, 0, 2, 15)

  if (total === 0) return null
  const s    = (score / total) * 100
  const tier = s >= 65 ? 'thriving' : s >= 38 ? 'stable' : s >= 18 ? 'caution' : 'concern'
  return { score: s, tier, ...HEALTH_TIERS[tier] }
}

export function useHealthScore() {
  const { primaryCompany, metrics, selectedFY } = useApp()

  const m   = metrics[primaryCompany] || {}
  const yrs = m.years || []
  let idx   = yrs.length - 1
  if (selectedFY) {
    const fi = yrs.indexOf(selectedFY)
    if (fi !== -1) idx = fi
  }

  const sales      = m.sales || []
  const rev_growth = (idx > 0 && sales[idx] != null && sales[idx - 1] != null && sales[idx - 1] !== 0)
    ? ((sales[idx] - sales[idx - 1]) / sales[idx - 1]) * 100
    : null

  return computeHealth({
    ebitda_margin: m.ebitda_margin?.[idx],
    roce:          m.roce?.[idx],
    debt_equity:   m.debt_equity?.[idx],
    rev_growth,
  })
}
