import KpiCard from './KpiCard'
import { useApp } from '../../context/AppContext'
import { fyLabel, parseQLabel } from '../../utils/fy'

const KPI_DEF = [
  { key: 'rev_growth',    label: 'Revenue Growth (YoY)', unit: '%',    tsKey: 'sales',         higherBetter: true,  computed: true },
  { key: 'ebitda_margin', label: 'EBITDA Margin',        unit: '%',    tsKey: 'ebitda_margin', higherBetter: true  },
  { key: 'roce',          label: 'ROCE',                 unit: '%',    tsKey: 'roce',          higherBetter: true  },
  { key: 'asset_turn',    label: 'Asset Turnover',       unit: 'x',    tsKey: 'asset_turn',    higherBetter: true  },
  { key: 'inv_turns',     label: 'Inventory Turns',      unit: 'x',    tsKey: 'inv_turns',     higherBetter: true  },
  { key: 'ccc',           label: 'Cash Conv. Cycle',     unit: 'days', tsKey: 'ccc',           higherBetter: false },
]

// Quarterly KPI set — only metrics available at quarter granularity
const Q_KPI_DEF = [
  { key: 'q_sales',     label: 'Revenue',          unit: 'cr', tsKey: 'q_sales', higherBetter: true },
  { key: 'q_opm',       label: 'OPM',              unit: '%',  tsKey: 'q_opm',   higherBetter: true },
  { key: 'q_op',        label: 'Operating Profit', unit: 'cr', tsKey: 'q_op',    higherBetter: true },
  { key: 'q_net',       label: 'Net Profit',       unit: 'cr', tsKey: 'q_net',   higherBetter: true },
  { key: 'q_sales_qoq', label: 'QoQ Growth',       unit: '%',  higherBetter: true, computed: true },
  { key: 'q_sales_yoy', label: 'YoY Growth',       unit: '%',  higherBetter: true, computed: true },
]

function trend(prev, curr, higherBetter) {
  if (prev == null || curr == null) return 0
  const delta = curr - prev
  if (Math.abs(delta) < 1e-6) return 0
  return (higherBetter ? delta > 0 : delta < 0) ? 1 : -1
}

export default function KpiRow() {
  const { companies, primaryCompany, metrics, selectedYears, selectedFY, selectedQuarter } = useApp()

  const primary    = companies.find(c => c.name === primaryCompany) || {}
  const primaryMet = metrics[primaryCompany] || {}
  const yrs        = primaryMet.years || []
  const qLabels    = primaryMet.q_labels || []

  // Resolve value + trend for an annual KPI at the active filter
  function resolve(def) {
    if (selectedFY) {
      const idx = yrs.indexOf(selectedFY)
      if (idx === -1) return { value: null, dir: 0 }

      let value
      if (def.computed) {
        const s = primaryMet.sales || []
        value = (idx > 0 && s[idx] != null && s[idx - 1] != null && s[idx - 1] !== 0)
          ? ((s[idx] - s[idx - 1]) / s[idx - 1]) * 100
          : null
      } else {
        const ts = primaryMet[def.tsKey] || []
        value = ts[idx] ?? null
      }

      let dir = 0
      if (idx > 0) {
        if (def.computed) {
          // rev_growth trend: is growth accelerating (curr YoY > prev YoY)?
          const s = primaryMet.sales || []
          const currG = (s[idx] != null && s[idx-1] != null && s[idx-1] !== 0)
            ? (s[idx] - s[idx-1]) / s[idx-1] * 100 : null
          const prevG = (idx > 1 && s[idx-1] != null && s[idx-2] != null && s[idx-2] !== 0)
            ? (s[idx-1] - s[idx-2]) / s[idx-2] * 100 : null
          dir = trend(prevG, currG, def.higherBetter)
        } else {
          const ts = primaryMet[def.tsKey] || []
          dir = trend(ts[idx - 1], ts[idx], def.higherBetter)
        }
      }
      return { value, dir }
    }

    // Range mode — latest in window
    const windowYears = yrs.slice(-selectedYears)
    const windowIdxs  = windowYears.map(y => yrs.indexOf(y)).filter(i => i !== -1)

    function lastNonNull(ts) {
      for (let i = windowIdxs.length - 1; i >= 0; i--) {
        const v = ts[windowIdxs[i]]
        if (v != null) return { val: v, pos: i }
      }
      return { val: null, pos: -1 }
    }

    if (def.computed) {
      // rev_growth trend: compare latest YoY vs previous YoY in the window
      const s       = primaryMet.sales || []
      const lastPos = windowIdxs.length - 1
      const latestI = lastPos >= 0 ? windowIdxs[lastPos]     : -1
      const prevI   = lastPos >= 1 ? windowIdxs[lastPos - 1] : -1
      const yoyAt   = i => (i > 0 && s[i] != null && s[i-1] != null && s[i-1] !== 0)
        ? (s[i] - s[i-1]) / s[i-1] * 100 : null
      const currG = latestI >= 0 ? yoyAt(latestI) : null
      const prevG = prevI   >= 0 ? yoyAt(prevI)   : null
      return { value: primary[def.key] ?? null, dir: trend(prevG, currG, def.higherBetter) }
    }

    const ts           = primaryMet[def.tsKey] || []
    const { val, pos } = lastNonNull(ts)
    const prevVal      = pos > 0 ? (ts[windowIdxs[pos - 1]] ?? null) : null
    return { value: val, dir: trend(prevVal, val, def.higherBetter) }
  }

  // Find the index in q_labels that matches a given fyEndYear + quarter number
  function findQIdx(fyEndYear, quarter) {
    return qLabels.findIndex(lbl => {
      const p = parseQLabel(lbl)
      return p.fyEndYear === fyEndYear && p.quarter === quarter
    })
  }

  // Resolve value + trend for a quarterly KPI
  function resolveQuarterly(def) {
    const qi = findQIdx(selectedFY, selectedQuarter)
    if (qi === -1) return { value: null, dir: 0 }

    if (def.key === 'q_sales_qoq') {
      const s = primaryMet.q_sales || []
      if (qi === 0 || s[qi] == null || s[qi - 1] == null || s[qi - 1] === 0)
        return { value: null, dir: 0 }
      const v = ((s[qi] - s[qi - 1]) / s[qi - 1]) * 100
      return { value: v, dir: v > 0.5 ? 1 : v < -0.5 ? -1 : 0 }
    }

    if (def.key === 'q_sales_yoy') {
      const s      = primaryMet.q_sales || []
      const prevQi = findQIdx(selectedFY - 1, selectedQuarter)
      if (prevQi === -1 || s[qi] == null || s[prevQi] == null || s[prevQi] === 0)
        return { value: null, dir: 0 }
      const v = ((s[qi] - s[prevQi]) / s[prevQi]) * 100
      return { value: v, dir: v > 0.5 ? 1 : v < -0.5 ? -1 : 0 }
    }

    const ts    = primaryMet[def.tsKey] || []
    const value = ts[qi] ?? null
    const dir   = (qi > 0 && ts[qi] != null && ts[qi - 1] != null)
      ? trend(ts[qi - 1], ts[qi], def.higherBetter)
      : 0
    return { value, dir }
  }

  // Compute ranking dynamically from metrics for a given FY
  function computeRanking(def, fy) {
    const scores = companies.map(c => {
      const m   = metrics[c.name] || {}
      const yrs = m.years || []
      const idx = yrs.indexOf(fy)
      if (idx === -1) return null
      let val
      if (def.computed) {
        const s = m.sales || []
        val = (idx > 0 && s[idx] != null && s[idx - 1] != null && s[idx - 1] !== 0)
          ? ((s[idx] - s[idx - 1]) / s[idx - 1]) * 100 : null
      } else {
        val = (m[def.tsKey] || [])[idx] ?? null
      }
      return val != null ? { name: c.name, val } : null
    }).filter(Boolean)

    scores.sort((a, b) => def.higherBetter ? b.val - a.val : a.val - b.val)
    const rank = scores.findIndex(s => s.name === primaryCompany) + 1
    return rank > 0 ? { rank, of: scores.length } : null
  }

  const inQuarterMode = !!(selectedFY && selectedQuarter)
  const activeDef     = inQuarterMode ? Q_KPI_DEF : KPI_DEF

  const periodLabel = inQuarterMode
    ? `Q${selectedQuarter} ${fyLabel(selectedFY)}`
    : selectedFY ? fyLabel(selectedFY) : null

  return (
    <div className="kpi-row">
      {activeDef.map(def => {
        const { value, dir } = inQuarterMode ? resolveQuarterly(def) : resolve(def)
        const r = selectedFY && !inQuarterMode
          ? computeRanking(def, selectedFY)
          : !selectedFY ? primary.ranks?.[def.key] : null
        return (
          <KpiCard
            key={def.key}
            label={def.label + (periodLabel ? ` — ${periodLabel}` : ' (TTM)')}
            value={value}
            unit={def.unit}
            rank={r?.rank}
            rankOf={r?.of}
            trend={dir}
          />
        )
      })}
    </div>
  )
}
