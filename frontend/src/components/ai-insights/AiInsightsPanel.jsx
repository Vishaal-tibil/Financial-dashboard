import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import InsightBullet     from './InsightBullet'
import InsightMetricCard from './InsightMetricCard'

// Module-level cache — survives component remounts, cleared on full page refresh
let _cache = null

export default function AiInsightsPanel() {
  const { isDataReady } = useApp()

  const [bullets,  setBullets]  = useState(_cache?.bullets || [])
  const [metrics,  setMetrics]  = useState(_cache?.metrics || [])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [lastFetch, setLastFetch] = useState(null)

  async function fetchInsights() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/insights', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg  = body.detail || `Server error ${res.status}`
        throw new Error(msg)
      }
      const data = await res.json()
      const b = data.insights || []
      const m = data.metrics  || []
      _cache = { bullets: b, metrics: m }
      setBullets(b)
      setMetrics(m)
      setLastFetch(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch when data becomes ready — skip if already cached
  useEffect(() => {
    if (isDataReady && !_cache) fetchInsights()
  }, [isDataReady])

  return (
    <div className="panel-section">
      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} /> AI Insights
        </span>
        {isDataReady && (
          <button
            onClick={fetchInsights}
            disabled={loading}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent)', padding: 2, opacity: loading ? 0.4 : 1,
            }}
            title="Refresh insights"
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        )}
      </div>

      {loading && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: '8px 0' }}>
          Analysing data…
        </div>
      )}

      {error && !loading && (
        <div style={{ color: 'var(--red)', fontSize: 11, padding: '4px 0' }}>
          {error} —{' '}
          <span
            onClick={fetchInsights}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            retry
          </span>
        </div>
      )}

      {!loading && bullets.map((b, i) => <InsightBullet key={i} text={b} />)}

      {!loading && metrics.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {metrics.map((m, i) => (
            <InsightMetricCard
              key={i}
              label={m.label}
              value={m.value}
              highlight={m.highlight}
              company={m.company}
            />
          ))}
        </div>
      )}

      {!loading && !error && !bullets.length && !metrics.length && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          {isDataReady ? 'No insights generated yet.' : 'Upload data to see AI insights.'}
        </div>
      )}
    </div>
  )
}
