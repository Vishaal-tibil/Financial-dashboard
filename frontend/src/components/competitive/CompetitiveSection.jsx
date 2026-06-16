import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ExternalLink, Newspaper } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const SENTIMENT_STYLE = {
  Positive: { background: 'rgba(22,163,74,0.08)',   color: '#16a34a' },
  Negative: { background: 'rgba(220,38,38,0.08)',   color: '#dc2626' },
  Neutral:  { background: 'rgba(100,116,139,0.08)', color: '#64748b' },
}

async function streamSSE(url, body, onEvent) {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.replace(/\r\n/g, '\n').split('\n\n')
    buffer = parts.pop()
    for (const part of parts) {
      const line = part.replace(/^data:\s*/, '').trim()
      if (line) { try { onEvent(JSON.parse(line)) } catch {} }
    }
  }
}

function NewsCard({ card }) {
  const sentStyle = SENTIMENT_STYLE[card.sentiment] || SENTIMENT_STYLE.Neutral
  return (
    <a
      href={card.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 14px', textDecoration: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {card.company_name.split(' ')[0]}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100, ...sentStyle }}>
          {card.sentiment}
        </span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 5,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {card.title}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {card.summary}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-card-2)', color: 'var(--text-muted)' }}>
          {card.category}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {card.published_date && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {new Date(card.published_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <ExternalLink size={10} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    </a>
  )
}

export default function CompetitiveSection() {
  const { primaryCompany, selectedCompanies, isDataReady } = useApp()

  // Include primary company so its own news appears, not just competitor news
  const allCompanies = [primaryCompany, ...selectedCompanies].filter(Boolean)

  const [cards,    setCards]    = useState([])
  const [streaming, setStreaming] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error,    setError]    = useState(null)
  const [showAll,  setShowAll]  = useState(false)

  // Load from cache on mount / when companies change
  const loadCached = useCallback(async () => {
    if (!allCompanies.length) return
    try {
      const res  = await fetch(`/api/feed/cached?competitors=${encodeURIComponent(allCompanies.join(','))}`)
      const data = await res.json()
      if (data.cards?.length) setCards(data.cards)
    } catch {}
  }, [allCompanies.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isDataReady) loadCached()
  }, [isDataReady, loadCached])

  async function refresh() {
    if (!allCompanies.length || streaming) return
    setStreaming(true)
    setProgress('Starting…')
    setError(null)
    try {
      await streamSSE(
        '/api/feed/refresh',
        { competitors: allCompanies },
        ev => {
          if (ev.type === 'progress') setProgress(ev.message)
          else if (ev.type === 'done') {
            setCards(ev.cards || [])
            setProgress(null)
          }
        }
      )
    } catch (e) {
      setError(e.message)
      setProgress(null)
    } finally {
      setStreaming(false)
    }
  }

  const shown = showAll ? cards : cards.slice(0, 6)

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Newspaper size={13} style={{ color: 'var(--accent)' }} />
          Competitor Intelligence Feed
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cards.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cards.length} stories</span>
          )}
          <button
            onClick={refresh}
            disabled={streaming || !allCompanies.length}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 500, color: 'var(--accent)',
              background: 'none', border: 'none', cursor: 'pointer',
              opacity: (streaming || !allCompanies.length) ? 0.4 : 1,
              padding: '3px 0',
            }}
          >
            <RefreshCw size={12} style={{ animation: streaming ? 'spin 1s linear infinite' : 'none' }} />
            {streaming ? 'Fetching…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
          {progress}
        </div>
      )}

      {/* Error */}
      {error && !streaming && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 10 }}>
          {error} —{' '}
          <span onClick={refresh} style={{ cursor: 'pointer', textDecoration: 'underline' }}>retry</span>
        </div>
      )}

      {/* Empty: no data loaded */}
      {!streaming && !cards.length && !allCompanies.length && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
          <Newspaper size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
          <div>Upload company data to see the intelligence feed</div>
        </div>
      )}

      {/* Empty: companies present but no cache yet */}
      {!streaming && !cards.length && allCompanies.length > 0 && !error && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
          <Newspaper size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
          <div style={{ marginBottom: 10 }}>No cached news yet</div>
          <button
            onClick={refresh}
            style={{ padding: '6px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}
          >
            Fetch latest news
          </button>
        </div>
      )}

      {/* Cards grid */}
      {shown.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {shown.map((c, i) => <NewsCard key={`${c.url}-${i}`} card={c} />)}
        </div>
      )}

      {/* Show more / less */}
      {cards.length > 6 && (
        <div style={{ marginTop: 10, textAlign: 'right' }}>
          <button
            onClick={() => setShowAll(v => !v)}
            style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {showAll ? 'Show less' : `Show all ${cards.length} stories →`}
          </button>
        </div>
      )}
    </div>
  )
}
