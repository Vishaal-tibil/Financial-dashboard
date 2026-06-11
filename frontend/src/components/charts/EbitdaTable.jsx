import { useApp } from '../../context/AppContext'

function pct(v) { return v != null ? `${Number(v).toFixed(1)}%` : '—' }

export default function EbitdaTable() {
  const { companies, primaryCompany, selectedCompanies } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Margin Comparison (Latest Year)</span>
      </div>
      <table className="fd-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>EBITDA %</th>
            <th>Net %</th>
            <th>Op %</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(c => (
            <tr key={c.name}>
              <td>
                <span className="company-dot" style={{ background: c.color }} />
                {c.name}
              </td>
              <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pct(c.ebitda_margin)}</td>
              <td>{pct(c.net_margin)}</td>
              <td>{pct(c.op_margin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
