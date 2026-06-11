export default function InsightMetricCard({ label, value, delta }) {
  const pos = delta > 0
  return (
    <div className="insight-metric-card">
      <div className="im-label">{label}</div>
      <div className="im-row">
        <span className="im-value">{value ?? '—'}</span>
        {delta != null && (
          <span className={`im-delta ${pos ? 'pos' : 'neg'}`}>
            {pos ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
