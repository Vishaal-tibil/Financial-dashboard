import { useApp } from '../../context/AppContext'

function pct(v) { return v != null ? `${Number(v).toFixed(1)}%` : '—' }
function cr(v)  { return v != null ? `₹${(v / 1000).toFixed(1)}k` : '—' }
function pp(v, favorable) {
  if (v == null) return null
  const sign  = v > 0 ? '+' : ''
  const color = (favorable ? v > 0 : v < 0) ? 'var(--green)' : 'var(--red)'
  return <span style={{ color, fontWeight: 700, fontSize: 10 }}>{sign}{v.toFixed(1)} pp</span>
}

function CostBar({ value, total, color }) {
  if (!value || !total) return <div style={{ width: 48 }} />
  const w = Math.min(100, (Math.abs(value) / total) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 48, height: 5, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', minWidth: 32 }}>
        {pct((value / total) * 100)}
      </span>
    </div>
  )
}

function EbitdaBar({ value, total }) {
  if (!value || !total) return <div style={{ width: 64 }} />
  const w      = Math.min(100, Math.max(0, (value / total) * 100))
  const pctVal = (value / total) * 100
  const color  = pctVal >= 15 ? '#16a34a' : pctVal >= 10 ? '#d97706' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 52, height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36 }}>
        {pct(pctVal)}
      </span>
    </div>
  )
}

export default function EbitdaTable() {
  const { companies, primaryCompany, selectedCompanies } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  const primary = visible.find(c => c.name === primaryCompany)
  const peers   = visible.filter(c => c.name !== primaryCompany)
  const best    = peers.length
    ? peers.reduce((a, b) => (b.ebitda_margin ?? 0) > (a.ebitda_margin ?? 0) ? b : a, peers[0])
    : null

  // Per-cost driver as % of revenue
  function costPct(c, field) {
    if (!c.wf_sales || c[field] == null) return null
    return (c[field] / c.wf_sales) * 100
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Margin Waterfall Benchmark</span>
        <span className="chart-card-sub">Latest year — cost breakdown</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="fd-table" style={{ minWidth: 480 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 100 }}>Company</th>
              <th style={{ textAlign: 'right' }}>Revenue</th>
              <th style={{ minWidth: 100 }}>Raw Mat %</th>
              <th style={{ minWidth: 100 }}>Emp Cost %</th>
              <th style={{ minWidth: 100 }}>Other OpEx %</th>
              <th style={{ minWidth: 110 }}>EBITDA Margin</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(c => {
              const rev       = c.wf_sales
              const ebitda_abs = c.ebitda_margin != null ? (c.ebitda_margin / 100) * (rev || 0) : null
              return (
                <tr key={c.name}>
                  <td>
                    <span className="company-dot" style={{ background: c.color }} />
                    {c.name.split(' ')[0]}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 11 }}>{cr(rev)}</td>
                  <td><CostBar value={c.wf_raw_mat}    total={rev} color="#ef4444" /></td>
                  <td><CostBar value={c.wf_emp_cost}   total={rev} color="#f97316" /></td>
                  <td><CostBar value={c.wf_other_opex} total={rev} color="#f59e0b" /></td>
                  <td><EbitdaBar value={ebitda_abs} total={rev} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Gap analysis footer */}
      {primary && best && (() => {
        const ebitdaGap = (primary.ebitda_margin ?? 0) - (best.ebitda_margin ?? 0)

        // Attribution: positive = primary is worse (higher cost %)
        const rmGap    = (costPct(primary, 'wf_raw_mat')    ?? 0) - (costPct(best, 'wf_raw_mat')    ?? 0)
        const empGap   = (costPct(primary, 'wf_emp_cost')   ?? 0) - (costPct(best, 'wf_emp_cost')   ?? 0)
        const opexGap  = (costPct(primary, 'wf_other_opex') ?? 0) - (costPct(best, 'wf_other_opex') ?? 0)
        const bestName = best.name.split(' ')[0]

        return (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                vs {bestName} (best peer)
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: ebitdaGap >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {ebitdaGap >= 0 ? '+' : ''}{ebitdaGap.toFixed(1)} pp EBITDA
              </span>
            </div>
            {/* Driver attribution */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Raw Mat:</span>
                {pp(-rmGap, true)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Emp Cost:</span>
                {pp(-empGap, true)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Other OpEx:</span>
                {pp(-opexGap, true)}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', alignSelf: 'center' }}>
                +ve = primary lower cost (better)
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
