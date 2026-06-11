import KpiCard from './KpiCard'
import { useApp } from '../../context/AppContext'

const KPI_DEF = [
  { key: 'rev_growth',    label: 'Revenue Growth',        unit: '%',    rankKey: 'rev_growth'    },
  { key: 'ebitda_margin', label: 'EBITDA Margin',          unit: '%',    rankKey: 'ebitda_margin' },
  { key: 'roce',          label: 'ROCE',                   unit: '%',    rankKey: 'roce'          },
  { key: 'asset_turn',    label: 'Asset Turnover',         unit: 'x',    rankKey: 'asset_turn'    },
  { key: 'inv_days',      label: 'Inventory Days',         unit: 'days', rankKey: 'inv_days'      },
  { key: 'ccc',           label: 'Cash Conversion Cycle',  unit: 'days', rankKey: 'ccc'           },
]

export default function KpiRow() {
  const { companies, primaryCompany } = useApp()
  const primary = companies.find(c => c.name === primaryCompany) || {}

  return (
    <div className="kpi-row">
      {KPI_DEF.map(({ key, label, unit, rankKey }) => {
        const r = primary.ranks?.[rankKey]
        return (
          <KpiCard
            key={key}
            label={label}
            value={primary[key]}
            unit={unit}
            rank={r?.rank}
            rankOf={r?.of}
            trend={primary[key]}
          />
        )
      })}
    </div>
  )
}
