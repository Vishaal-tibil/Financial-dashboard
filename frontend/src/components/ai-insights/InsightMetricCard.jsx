const COLORS = {
  positive: 'var(--green)',
  negative: 'var(--red)',
  neutral:  'var(--accent)',
}

export default function InsightMetricCard({ label, value, highlight = 'neutral', company }) {
  return (
    <div className="insight-metric-card">
      <div className="im-label">{label}</div>
      <div className="im-row">
        <span className="im-value" style={{ color: COLORS[highlight] || COLORS.neutral }}>
          {value ?? '—'}
        </span>
        {company && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
            {company}
          </span>
        )}
      </div>
    </div>
  )
}
