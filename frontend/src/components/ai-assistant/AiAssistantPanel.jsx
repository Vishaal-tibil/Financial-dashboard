import { useRef, useState, useEffect } from 'react'
import { Bot, Send, RefreshCw, Zap, Loader } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const SUGGESTIONS = [
  'Where do I lag on margins vs the best peer?',
  'Which competitor is most capital efficient?',
  'Summarise my working-capital position.',
]

// Stage labels shown while waiting for a response
const STAGE = {
  connecting:  'Connecting to AI…',
  analysing:   'Analysing your question…',
  searching:   null,   // filled dynamically
  processing:  'Processing search results…',
  generating:  'Generating response…',
}

async function streamSSE(url, body, onEvent) {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`Server error ${res.status}: ${text}`)
  }
  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // sse_starlette sends \r\n\r\n between events — normalise to \n\n first
    const parts = buffer.replace(/\r\n/g, '\n').split('\n\n')
    buffer = parts.pop()
    for (const part of parts) {
      const line = part.replace(/^data:\s*/, '').trim()
      if (line) {
        try { onEvent(JSON.parse(line)) } catch {}
      }
    }
  }
}

export default function AiAssistantPanel() {
  const { primaryCompany, selectedCompanies } = useApp()
  const [messages,   setMessages]   = useState([])
  const [input,      setInput]      = useState('')
  const [busy,       setBusy]       = useState(false)
  const [statusLine, setStatusLine] = useState(null)   // shown below messages
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, statusLine])

  async function send(question) {
    if (!question.trim() || busy) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: question }, { role: 'assistant', text: '', pending: true }])
    setBusy(true)
    setStatusLine(STAGE.connecting)

    let firstToken = false

    try {
      await streamSSE(
        '/api/chat',
        {
          question,
          your_company: primaryCompany || '',
          competitors:  selectedCompanies || [],
          session_id:   'default',
        },
        ev => {
          if (ev.type === 'status') {
            setStatusLine(ev.text)
          } else if (ev.type === 'tool') {
            setStatusLine(`Searching web: "${ev.query}"…`)
          } else if (ev.type === 'token') {
            if (!firstToken) {
              firstToken = true
              setStatusLine(null)
              // clear pending flag
              setMessages(m => {
                const copy = [...m]
                copy[copy.length - 1] = { ...copy[copy.length - 1], pending: false }
                return copy
              })
            }
            setMessages(m => {
              const copy = [...m]
              copy[copy.length - 1] = {
                role: 'assistant',
                text: copy[copy.length - 1].text + ev.text,
                pending: false,
              }
              return copy
            })
          } else if (ev.type === 'done') {
            setStatusLine(null)
            // Ensure pending spinner is cleared even if no tokens arrived
            setMessages(m => {
              const copy = [...m]
              const last = copy[copy.length - 1]
              if (last?.pending) copy[copy.length - 1] = { ...last, pending: false }
              return copy
            })
          } else if (ev.type === 'error') {
            setStatusLine(null)
            setMessages(m => {
              const copy = [...m]
              copy[copy.length - 1] = { role: 'assistant', text: `⚠ ${ev.message}`, pending: false }
              return copy
            })
          }
        }
      )
    } catch (e) {
      setStatusLine(null)
      setMessages(m => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', text: `⚠ ${e.message}`, pending: false }
        return copy
      })
    } finally {
      setBusy(false)
      setStatusLine(null)
    }
  }

  async function resetChat() {
    await fetch('/api/chat/reset', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ session_id: 'default' }),
    }).catch(() => {})
    setMessages([])
    setStatusLine(null)
  }

  return (
    <div className="panel-section panel-half" style={{ display: 'flex', flexDirection: 'column', padding: 14 }}>
      {/* Header */}
      <div className="panel-title" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bot size={13} /> AI Assistant
        </span>
        {messages.length > 0 && (
          <button
            onClick={resetChat}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
            title="Reset conversation"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
            <Bot size={24} style={{ opacity: 0.2, color: 'var(--accent)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Ask anything about the selected companies
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', marginTop: 4 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    fontSize: 10, padding: '5px 8px', borderRadius: 8,
                    background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)',
                    color: 'var(--accent)', cursor: 'pointer', textAlign: 'left', lineHeight: 1.4,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '88%', borderRadius: 10, padding: '6px 10px',
                fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                background: m.role === 'user' ? 'var(--accent)'    : 'var(--bg-card-2)',
                color:      m.role === 'user' ? '#fff'              : 'var(--text-primary)',
              }}>
                {m.pending
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.5 }}>
                      <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} />
                      waiting for AI…
                    </span>
                  : (m.text || <span style={{ opacity: 0.4 }}>…</span>)
                }
              </div>
            </div>
          ))
        )}
      </div>

      {/* Live status line — shown while request is in flight */}
      {statusLine && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10, color: 'var(--accent)',
          marginBottom: 6, paddingLeft: 2,
        }}>
          {statusLine.startsWith('Search') || statusLine.startsWith('Process')
            ? <Zap size={11} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            : <Loader size={11} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          }
          {statusLine}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); send(input) }}
        style={{ display: 'flex', gap: 6, flexShrink: 0 }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about margins, returns…"
          disabled={busy}
          style={{
            flex: 1, border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 9px', fontSize: 11, background: 'var(--bg-base)',
            color: 'var(--text-primary)', outline: 'none',
            opacity: busy ? 0.6 : 1,
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          style={{
            background: 'var(--accent)', border: 'none', borderRadius: 8,
            color: '#fff', padding: '6px 10px', cursor: 'pointer',
            opacity: (busy || !input.trim()) ? 0.4 : 1, flexShrink: 0,
          }}
        >
          {busy ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
        </button>
      </form>
    </div>
  )
}
