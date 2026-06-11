import { useApp } from '../../context/AppContext'

const METRICS = [
  { key: 'asset_turn',  label: 'Asset Turnover',   fmt: v => `${Number(v).toFixed(2)}x`, higherBetter: true  },
  { key: 'inv_days',    label: 'Inventory Days',    fmt: v => `${Math.round(v)}d`,        higherBetter: false },
  { key: 'debtor_days', label: 'Receivable Days',   fmt: v => `${Math.round(v)}d`,        higherBetter: false },
  { key: 'ccc',         label: 'CCC',               fmt: v => `${Math.round(v)}d`,        higherBetter: false },
  { key: 'debt_equity', label: 'D/E',               fmt: v => `${Number(v).toFixed(2)}x`, higherBetter: false },
]

const MARGIN_METRICS = [
  { key: 'ebitda_margin', label: 'EBITDA %', fmt: v => `${Number(v).toFixed(1)}%`, higherBetter: true },
  { key: 'net_margin',    label: 'Net %',    fmt: v => `${Number(v).toFixed(1)}%`, higherBetter: true },
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
  const { companies, primaryCompany, selectedCompanies } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  function MetricRows({ metrics }) {
    return metrics.map(({ key, label, fmt, higherBetter }) => {
      const vals = visible.map(c => c[key])
      return (
        <tr key={key}>
          <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 11 }}>{label}</td>
          {visible.map(c => {
            const v   = c[key]
            const pct = barPct(v, vals, higherBetter)
            return (
              <td key={c.name}>
                <div className="inline-bar-row">
                  <div className="inline-bar-bg">
                    <div className="inline-bar-fill" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                  <span className="inline-val">{v != null ? fmt(v) : '—'}</span>
                </div>
              </td>
            )
          })}
        </tr>
      )
    })
  }

  return (
    <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="chart-card-header">
        <span className="chart-card-title">Operational Metrics</span>
        <span className="chart-card-sub">Latest year</span>
      </div>

      {/* Main operational table */}
      <table className="fd-table">
        <thead>
          <tr>
            <th style={{ width: 110 }}>Metric</th>
            {visible.map(c => (
              <th key={c.name} title={c.name} style={{ color: c.color }}>
                {c.name.split(' ')[0].charAt(0) + c.name.split(' ')[0].slice(1).toLowerCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <MetricRows metrics={METRICS} />
        </tbody>
      </table>

      {/* EBITDA vs Net Margin divider section */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '8px 0 2px',
        marginTop: 6,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px 6px' }}>
          EBITDA vs Net Margin
        </div>
        <table className="fd-table">
          <tbody>
            <MetricRows metrics={MARGIN_METRICS} />
          </tbody>
        </table>
      </div>
    </div>
  )
}
