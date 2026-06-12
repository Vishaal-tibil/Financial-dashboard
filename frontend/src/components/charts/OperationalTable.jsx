import { useApp } from '../../context/AppContext'

const METRICS = [
  { key: 'asset_turn',   label: 'Asset Turnover',    fmt: v => `${Number(v).toFixed(2)}x`, higherBetter: true  },
  { key: 'inv_turns',    label: 'Inventory Turns',   fmt: v => `${Number(v).toFixed(1)}x`, higherBetter: true  },
  { key: 'inv_days',     label: 'Inventory Days',    fmt: v => `${Math.round(v)}d`,        higherBetter: false },
  { key: 'debtor_days',  label: 'Receivable Days',   fmt: v => `${Math.round(v)}d`,        higherBetter: false },
  { key: 'ccc',          label: 'Cash Conv. Cycle',  fmt: v => `${Math.round(v)}d`,        higherBetter: false },
  { key: 'cfo_to_sales', label: 'CFO / Sales',       fmt: v => `${Number(v).toFixed(1)}%`, higherBetter: true  },
  { key: 'debt_equity',  label: 'D/E Ratio',         fmt: v => `${Number(v).toFixed(2)}x`, higherBetter: false },
]

function norm(val, min, max, higherBetter) {
  if (val == null || max === min) return 50
  const n = ((val - min) / (max - min)) * 100
  return higherBetter ? n : 100 - n
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

function findBestPeer(peers, all) {
  if (!peers.length) return null
  const ranges = METRICS.map(({ key }) => {
    const vals = all.map(c => c[key]).filter(v => v != null)
    return { min: Math.min(...vals), max: Math.max(...vals) }
  })
  return peers.reduce((best, c) => {
    const score = x => METRICS.reduce((s, { key, higherBetter }, i) =>
      s + norm(x[key], ranges[i].min, ranges[i].max, higherBetter), 0)
    return score(c) > score(best) ? c : best
  }, peers[0])
}

function vsBest(val, best, higherBetter) {
  if (val == null || best == null) return null
  return higherBetter ? val - best : best - val
}

export default function OperationalTable() {
  const { companies, primaryCompany } = useApp()

  const primary  = companies.find(c => c.name === primaryCompany)
  const peers    = companies.filter(c => c.name !== primaryCompany)
  const bestPeer = findBestPeer(peers, companies)

  const shortName = c => c.name.split(' ')[0]

  return (
    <div className="chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="chart-card-header">
        <span className="chart-card-title">Operational Benchmarking</span>
        <span className="chart-card-sub">Latest year</span>
      </div>

      <div style={{ overflowX: 'auto', flex: 1 }}>
        <table className="fd-table" style={{ minWidth: 340, width: '100%', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 110 }}>KPI</th>
              {primary   && <th style={{ color: primary.color,   minWidth: 72, textAlign: 'right' }}>{shortName(primary)}</th>}
              {bestPeer  && <th style={{ color: bestPeer.color,  minWidth: 72, textAlign: 'right' }}>Best ({shortName(bestPeer)})</th>}
              <th style={{ color: '#94a3b8', minWidth: 72, textAlign: 'right' }}>Ind. Median</th>
              {primary   && <th style={{ minWidth: 60, textAlign: 'right' }}>vs Best</th>}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(({ key, label, fmt, higherBetter }) => {
              const allVals    = companies.map(c => c[key]).filter(v => v != null)
              const medVal     = allVals.length ? median(allVals) : null
              const bestVal    = bestPeer?.[key]
              const primaryVal = primary?.[key]
              const diff       = vsBest(primaryVal, bestVal, higherBetter)

              return (
                <tr key={key}>
                  <td style={{ fontWeight: 600, fontSize: 11 }}>{label}</td>

                  {/* Primary */}
                  <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {primaryVal != null ? fmt(primaryVal) : '—'}
                  </td>

                  {/* Best peer */}
                  {bestPeer && (
                    <td style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>
                      {bestVal != null ? fmt(bestVal) : '—'}
                    </td>
                  )}

                  {/* Industry median */}
                  <td style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8' }}>
                    {medVal != null ? fmt(medVal) : '—'}
                  </td>

                  {/* vs Best delta */}
                  {primary && (() => {
                    if (diff == null) return <td style={{ textAlign: 'right' }}>—</td>
                    const isExact = Math.abs(diff) < 0.005
                    const isGood  = diff >= 0
                    return (
                      <td style={{
                        textAlign: 'right', fontSize: 10.5, fontWeight: 700,
                        color: isExact ? 'var(--text-muted)' : isGood ? 'var(--green)' : 'var(--red)',
                      }}>
                        {isExact ? '—' : (isGood ? '+' : '') + diff.toFixed(Math.abs(diff) > 1 ? 1 : 2)}
                      </td>
                    )
                  })()}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 6, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
        * CCC = Inv Days + Debtor Days only (payable days excluded — not available from data source)
      </div>
    </div>
  )
}
