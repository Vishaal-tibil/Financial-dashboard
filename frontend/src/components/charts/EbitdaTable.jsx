import { useApp } from '../../context/AppContext'
import { fyLabel } from '../../utils/fy'

function r1(v) { return Math.round(v * 10) / 10 }

function fmtRev(v) {
  if (v == null) return '—'
  return Math.round(v).toLocaleString('en-IN')
}

const SEGS = [
  { key: 'rawMat',  label: 'Raw Material Cost %',  color: '#ef4444', dimColor: 'rgba(239,68,68,0.10)', sign: '−' },
  { key: 'empCost', label: 'Employee Cost %',       color: '#f97316', dimColor: 'rgba(249,115,22,0.10)', sign: '−' },
  { key: 'other',   label: 'Other Expenses %',      color: '#f59e0b', dimColor: 'rgba(245,158,11,0.10)', sign: '−' },
  { key: 'ebitda',  label: 'EBITDA Margin %',       color: '#16a34a', dimColor: 'rgba(22,163,74,0.10)',  sign: ''  },
]

function BarCell({ seg, val, maxVal }) {
  const pct = maxVal > 0 ? Math.min((val / maxVal) * 100, 100) : 0
  const showInside = pct > 38

  return (
    <td
      style={{
        padding: '10px 12px',
        borderLeft: '1px solid var(--border)',
        background: seg.dimColor,
        verticalAlign: 'middle',
        minWidth: 120,
      }}
    >
      <div style={{ position: 'relative', height: 28 }}>
        {/* Filled bar */}
        <div
          style={{
            position: 'absolute',
            left: 0, top: 4,
            width: `${pct}%`,
            height: 20,
            background: seg.color,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {showInside && (
            <span style={{ color: 'white', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', userSelect: 'none' }}>
              {seg.sign}{val.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Bridge line: from bar end to cell right edge */}
        {seg.key !== 'ebitda' && (
          <div
            style={{
              position: 'absolute',
              left: `${pct}%`, right: 0,
              top: 14,
              height: 1,
              background: seg.color,
              opacity: 0.25,
            }}
          />
        )}

        {/* Outside label when bar is narrow */}
        {!showInside && (
          <div
            style={{
              position: 'absolute',
              left: `calc(${pct}% + 6px)`,
              top: 4, height: 20,
              display: 'flex', alignItems: 'center',
              color: seg.color,
              fontSize: 10, fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {seg.sign}{val.toFixed(1)}%
          </div>
        )}
      </div>
    </td>
  )
}

export default function EbitdaTable() {
  const { companies, primaryCompany, selectedCompanies, meta } = useApp()

  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  const rows = visible.map(c => {
    if (!c.wf_sales) return null
    const rawMat  = r1((c.wf_raw_mat  / c.wf_sales) * 100)
    const empCost = r1((c.wf_emp_cost / c.wf_sales) * 100)
    const ebitda  = r1(c.ebitda_margin || 0)
    const other   = r1(Math.max(0, 100 - rawMat - empCost - ebitda))
    return { name: c.name.split(' ')[0], fullName: c.name, color: c.color, revenue: c.wf_sales, rawMat, empCost, other, ebitda }
  }).filter(Boolean)

  const latestFY = meta?.latest_year ? fyLabel(meta.latest_year) : 'Latest'

  if (!rows.length) {
    return (
      <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--text-muted)', fontSize: 12 }}>
        No P&amp;L data available
      </div>
    )
  }

  // Scale each column to its own max (so bars always fill meaningfully)
  const maxVals = {}
  SEGS.forEach(s => {
    maxVals[s.key] = Math.max(...rows.map(r => r[s.key] || 0), 1) * 1.08
  })

  // Gap analysis vs best EBITDA peer
  const primary = rows.find(r => r.fullName === primaryCompany)
  const peers   = rows.filter(r => r.fullName !== primaryCompany)
  const best    = peers.length ? peers.reduce((a, b) => b.ebitda > a.ebitda ? b : a, peers[0]) : null

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Margin Waterfall Benchmark</span>
        <span className="chart-card-sub">{latestFY} TTM — % of Revenue</span>
      </div>

      <div style={{ overflowX: 'auto', marginTop: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={TH({ textAlign: 'left', width: 130 })}>Company</th>
              <th style={TH({ textAlign: 'right', width: 88 })}>
                Revenue<br />
                <span style={{ fontWeight: 400, opacity: 0.7 }}>(₹ Cr)</span>
              </th>
              {SEGS.map(seg => (
                <th key={seg.key} style={TH({ borderLeft: '1px solid var(--border)', background: seg.dimColor })}>
                  {seg.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.fullName} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                {/* Company name */}
                <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{row.name}</span>
                  </span>
                </td>

                {/* Revenue */}
                <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 11.5, color: 'var(--text-muted)', verticalAlign: 'middle', fontWeight: 500 }}>
                  {fmtRev(row.revenue)}
                </td>

                {/* Cost + EBITDA bars */}
                {SEGS.map(seg => (
                  <BarCell key={seg.key} seg={seg} val={row[seg.key]} maxVal={maxVals[seg.key]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gap analysis footer */}
      {primary && best && (() => {
        const ebitdaGap = r1(primary.ebitda  - best.ebitda)
        const deltas    = [
          { dot: '#ef4444', label: 'Raw Mat',  val: r1(best.rawMat  - primary.rawMat)  },
          { dot: '#f97316', label: 'Emp Cost', val: r1(best.empCost - primary.empCost) },
          { dot: '#f59e0b', label: 'Other',    val: r1(best.other   - primary.other)   },
        ]
        return (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
              {primary.name} vs {best.name} (best peer):
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: ebitdaGap >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {ebitdaGap >= 0 ? '+' : ''}{ebitdaGap} pp EBITDA
            </span>
            {deltas.map(({ dot, label, val }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block' }} />
                <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                <span style={{ fontWeight: 700, color: Math.abs(val) < 0.05 ? 'var(--text-muted)' : val > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {val > 0 ? '+' : ''}{val} pp
                </span>
              </span>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

function TH(extra = {}) {
  return {
    padding: '7px 10px',
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: 600,
    color: '#64748b',
    borderBottom: '2px solid var(--border)',
    whiteSpace: 'nowrap',
    ...extra,
  }
}
