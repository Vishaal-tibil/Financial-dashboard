import KpiCard from './KpiCard'
import { useApp } from '../../context/AppContext'
import { fyLabel } from '../../utils/fy'

const KPI_DEF = [
  { key: 'rev_growth',    label: 'Revenue Growth (YoY)', unit: '%',    tsKey: 'sales',         higherBetter: true,  computed: true },
  { key: 'ebitda_margin', label: 'EBITDA Margin',        unit: '%',    tsKey: 'ebitda_margin', higherBetter: true  },
  { key: 'roce',          label: 'ROCE',                 unit: '%',    tsKey: 'roce',          higherBetter: true  },
  { key: 'asset_turn',    label: 'Asset Turnover',       unit: 'x',    tsKey: 'asset_turn',    higherBetter: true  },
  { key: 'inv_turns',     label: 'Inventory Turns',      unit: 'x',    tsKey: 'inv_turns',     higherBetter: true  },
  { key: 'ccc',           label: 'Cash Conv. Cycle',     unit: 'days', tsKey: 'ccc',           higherBetter: false },
]

// +1 improved, -1 worsened, 0 flat
function trend(prev, curr, higherBetter) {
  if (prev == null || curr == null) return 0
  const delta = curr - prev
  if (Math.abs(delta) < 1e-6) return 0
  return (higherBetter ? delta > 0 : delta < 0) ? 1 : -1
}

export default function KpiRow() {
  const { companies, primaryCompany, metrics, selectedYears, selectedFY } = useApp()

  const primary    = companies.find(c => c.name === primaryCompany) || {}
  const primaryMet = metrics[primaryCompany] || {}
  const yrs        = primaryMet.years || []

  // Resolve value + trend for a KPI at the active filter
  function resolve(def) {
    if (selectedFY) {
      const idx  = yrs.indexOf(selectedFY)
      if (idx === -1) return { value: null, dir: 0 }

      let value
      if (def.computed) {
        // YoY revenue growth
        const s = primaryMet.sales || []
        value = (idx > 0 && s[idx] != null && s[idx - 1] != null && s[idx - 1] !== 0)
          ? ((s[idx] - s[idx - 1]) / s[idx - 1]) * 100
          : null
      } else {
        const ts = primaryMet[def.tsKey] || []
        value = ts[idx] ?? null
      }

      // Trend: compare to previous year
      let dir = 0
      if (idx > 0) {
        const ts = primaryMet[def.tsKey] || []
        dir = def.computed
          ? 0   // rev_growth vs prev-rev_growth is confusing, skip trend arrow
          : trend(ts[idx - 1], ts[idx], def.higherBetter)
      }
      return { value, dir }
    }

    // Range mode — latest in window
    const windowYears = yrs.slice(-selectedYears)
    const windowIdxs  = windowYears.map(y => yrs.indexOf(y)).filter(i => i !== -1)

    // Last non-null value in window
    function lastNonNull(ts) {
      for (let i = windowIdxs.length - 1; i >= 0; i--) {
        const v = ts[windowIdxs[i]]
        if (v != null) return { val: v, pos: i }
      }
      return { val: null, pos: -1 }
    }

    if (def.computed) {
      // YoY growth from companies snapshot
      return { value: primary[def.key] ?? null, dir: 0 }
    }

    const ts           = primaryMet[def.tsKey] || []
    const { val, pos } = lastNonNull(ts)
    const prevVal      = pos > 0 ? (ts[windowIdxs[pos - 1]] ?? null) : null
    return { value: val, dir: trend(prevVal, val, def.higherBetter) }
  }

  // Rank comes from companies snapshot (always latest year)
  const label = selectedFY ? fyLabel(selectedFY) : null

  return (
    <div className="kpi-row">
      {KPI_DEF.map(def => {
        const { value, dir } = resolve(def)
        const r = selectedFY ? null : primary.ranks?.[def.key]
        return (
          <KpiCard
            key={def.key}
            label={def.label + (label ? ` — ${label}` : ' (TTM)')}
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
