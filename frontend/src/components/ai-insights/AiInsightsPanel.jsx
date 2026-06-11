import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import InsightBullet     from './InsightBullet'
import InsightMetricCard from './InsightMetricCard'

export default function AiInsightsPanel() {
  const { isDataReady } = useApp()

  const [bullets,  setBullets]  = useState([])
  const [metrics,  setMetrics]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [lastFetch, setLastFetch] = useState(null)

  async function fetchInsights() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/insights', { method: 'POST' })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setBullets(data.insights || [])
      setMetrics(data.metrics  || [])
      setLastFetch(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch when data becomes ready
  useEffect(() => {
    if (isDataReady) fetchInsights()
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
          Analysing data with Qwen…
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
