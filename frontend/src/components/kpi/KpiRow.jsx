import KpiCard from './KpiCard'
import { useApp } from '../../context/AppContext'

// higherBetter: true = up trend is green; false = down trend is green (e.g. CCC)
const KPI_DEF = [
  { key: 'rev_growth',    label: 'Revenue Growth (YoY)',   unit: '%',    rankKey: 'rev_growth',    tsKey: 'sales',         higherBetter: true  },
  { key: 'ebitda_margin', label: 'EBITDA Margin (TTM)',    unit: '%',    rankKey: 'ebitda_margin', tsKey: 'ebitda_margin', higherBetter: true  },
  { key: 'roce',          label: 'ROCE (TTM)',             unit: '%',    rankKey: 'roce',          tsKey: 'roce',          higherBetter: true  },
  { key: 'asset_turn',    label: 'Asset Turnover (TTM)',   unit: 'x',    rankKey: 'asset_turn',    tsKey: 'asset_turn',    higherBetter: true  },
  { key: 'inv_turns',     label: 'Inventory Turns (TTM)', unit: 'x',    rankKey: 'inv_turns',     tsKey: 'inv_turns',     higherBetter: true  },
  { key: 'ccc',           label: 'Cash Conversion Cycle', unit: 'days', rankKey: 'ccc',           tsKey: 'ccc',           higherBetter: false },
]

// Returns +1 (improved), -1 (worsened), 0 (flat/unknown) relative to prior year
function yoyTrend(timeSeries, higherBetter) {
  if (!timeSeries) return 0
  const vals = timeSeries.filter(v => v != null)
  if (vals.length < 2) return 0
  const delta = vals[vals.length - 1] - vals[vals.length - 2]
  if (Math.abs(delta) < 1e-6) return 0
  const improved = higherBetter ? delta > 0 : delta < 0
  return improved ? 1 : -1
}

export default function KpiRow() {
  const { companies, primaryCompany, metrics } = useApp()
  const primary    = companies.find(c => c.name === primaryCompany) || {}
  const primaryMet = metrics[primaryCompany] || {}

  return (
    <div className="kpi-row">
      {KPI_DEF.map(({ key, label, unit, rankKey, tsKey, higherBetter }) => {
        const r    = primary.ranks?.[rankKey]
        const dir  = yoyTrend(primaryMet[tsKey], higherBetter)
        return (
          <KpiCard
            key={key}
            label={label}
            value={primary[key]}
            unit={unit}
            rank={r?.rank}
            rankOf={r?.of}
            trend={dir}
          />
        )
      })}
    </div>
  )
}
