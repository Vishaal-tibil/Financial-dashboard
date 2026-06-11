import { useApp } from '../../context/AppContext'

const METRICS = [
  { key: 'asset_turn',  label: 'Asset Turnover',   fmt: v => `${Number(v).toFixed(2)}x`, higherBetter: true  },
  { key: 'inv_days',    label: 'Inventory Days',    fmt: v => `${Math.round(v)}d`,        higherBetter: false },
  { key: 'debtor_days', label: 'Receivable Days',   fmt: v => `${Math.round(v)}d`,        higherBetter: false },
  { key: 'ccc',         label: 'Cash Conv. Cycle',  fmt: v => `${Math.round(v)}d`,        higherBetter: false },
  { key: 'debt_equity', label: 'Debt / Equity',     fmt: v => `${Number(v).toFixed(2)}x`, higherBetter: false },
]

function barPct(val, vals, higherBetter) {
  const valid = vals.filter(v => v != null)
  if (!valid.length || val == null) return 0
  const mn = Math.min(...valid), mx = Math.max(...valid)
  if (mx === mn) return 50
  const ratio = (val - mn) / (mx - mn)
  return higherBetter ? ratio * 100 : (1 - ratio) * 100
}

export default function OperationalTable() {
  const { companies, primaryCompany, selectedCompanies, metrics } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Operational Metrics</span>
        <span className="chart-card-sub">Latest year, all peers</span>
      </div>
      <table className="fd-table">
        <thead>
          <tr>
            <th>Metric</th>
            {visible.map(c => <th key={c.name}>{c.name.split(' ')[0]}</th>)}
          </tr>
        </thead>
        <tbody>
          {METRICS.map(({ key, label, fmt, higherBetter }) => {
            const vals = visible.map(c => c[key])
            return (
              <tr key={key}>
                <td><span className="op-table-metric">{label}</span></td>
                {visible.map((c, i) => {
                  const v   = c[key]
                  const pct = barPct(v, vals, higherBetter)
                  const col = c.color
                  return (
                    <td key={c.name}>
                      <div className="inline-bar-row">
                        <div className="inline-bar-bg">
                          <div className="inline-bar-fill" style={{ width: `${pct}%`, background: col }} />
                        </div>
                        <span className="inline-val">{v != null ? fmt(v) : '—'}</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
