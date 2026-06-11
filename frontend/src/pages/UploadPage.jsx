import { useState, useRef, useCallback } from 'react'
import { Upload, CheckCircle, FileSpreadsheet, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'

const STAGE_PCT = { uploading: 15, processing: 35, computing: 65, generating: 85, ready: 100 }

export default function UploadPage() {
  const { navigate, loadData, isDataReady, goBack } = useApp()
  const [dragOver, setDragOver]     = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [stage, setStage]           = useState('')
  const [pct, setPct]               = useState(0)
  const [error, setError]           = useState('')
  const [uploaded, setUploaded]     = useState([])  // companies successfully loaded
  const inputRef                    = useRef()

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError('Please upload an .xlsx or .xls file.')
      return
    }
    setError('')
    setUploading(true)
    setStage('uploading')
    setPct(10)

    const form = new FormData()
    form.append('file', file)

    const es = new EventSource('')   // we use fetch + ReadableStream for SSE with POST
    es.close()                       // close the dummy, we'll do it manually below

    fetch('/api/upload', { method: 'POST', body: form })
      .then(res => {
        const reader = res.body.getReader()
        const dec    = new TextDecoder()
        let   buf    = ''

        function pump() {
          return reader.read().then(({ done, value }) => {
            if (done) { setUploading(false); return }
            buf += dec.decode(value, { stream: true })
            const parts = buf.split('\n\n')
            buf = parts.pop()         // keep incomplete chunk

            parts.forEach(part => {
              const dataLine = part.split('\n').find(l => l.startsWith('data:'))
              const evtLine  = part.split('\n').find(l => l.startsWith('event:'))
              if (!dataLine) return
              try {
                const msg  = JSON.parse(dataLine.replace('data:', '').trim())
                const evt  = evtLine ? evtLine.replace('event:', '').trim() : 'progress'
                const p    = msg.pct ?? STAGE_PCT[msg.stage] ?? pct
                setPct(p)
                setStage(msg.message || msg.stage || '')

                if (evt === 'ready') {
                  setUploading(false)
                  // Extract company name from "'{name}' loaded" message
                  const match = msg.message.match(/'(.+?)'/)
                  if (match) setUploaded(u => [...u.filter(x => x !== match[1]), match[1]])
                  loadData()
                }
                if (evt === 'error') {
                  setUploading(false)
                  setError(msg.message || 'Upload failed')
                }
              } catch {}
            })
            return pump()
          })
        }
        return pump()
      })
      .catch(e => { setUploading(false); setError(e.message) })
  }, [loadData, pct])

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true) }

  async function loadSample() {
    setError('')
    setUploading(true)
    setStage('Loading sample data…')
    setPct(50)
    try {
      await fetch('/api/load-sample', { method: 'POST' })
      await loadData()
      setPct(100)
      setStage('Sample data loaded')
      setUploaded(['Carborundum', 'Grindwell', 'SKF', 'Timken', 'Wendt'])
    } catch (e) {
      setError(e.message)
    }
    setUploading(false)
  }

  return (
    <div className="upload-page">
      {/* Back button — shown when navigated from dashboard */}
      {isDataReady && (
        <button
          onClick={() => navigate('overview')}
          style={{
            position: 'absolute', top: 20, left: 20,
            background: 'none', border: 'none', color: 'var(--accent)',
            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          ← Back to Dashboard
        </button>
      )}

      {/* Logo */}
      <div className="upload-logo">
        <div className="upload-logo-icon">F</div>
        <span className="upload-logo-text">FinCompare</span>
      </div>

      <h2 style={{ color: 'var(--text-primary)', marginBottom: 6, fontSize: 20, fontWeight: 700 }}>
        Executive Cockpit
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28 }}>
        Upload company financials to start benchmarking
      </p>

      {/* Drop zone */}
      <div
        className={`upload-box${dragOver ? ' drag-over' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        <div className="upload-icon-wrap">
          <Upload size={44} />
        </div>
        <div className="upload-title">Drop your Excel file here</div>
        <div className="upload-sub">
          One company per upload — upload multiple to benchmark side-by-side
        </div>
        <button className="btn-browse" disabled={uploading}>
          Browse File
        </button>
        <div className="upload-hint">Supports .xlsx and .xls — max 100 MB</div>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-label">{stage}</div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="upload-error">{error}</div>}

      {/* Uploaded companies */}
      {uploaded.length > 0 && (
        <div className="uploaded-list">
          {uploaded.map(name => (
            <div key={name} className="uploaded-item">
              <CheckCircle size={14} color="var(--green)" />
              <FileSpreadsheet size={14} color="var(--text-muted)" />
              {name}
            </div>
          ))}
          <button className="btn-upload-more" onClick={() => inputRef.current?.click()}>
            + Upload another company
          </button>
          <button className="btn-goto" onClick={() => navigate('overview')}>
            Open Dashboard <ArrowRight size={14} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
          </button>
        </div>
      )}

      {/* Load sample */}
      {uploaded.length === 0 && !uploading && (
        <button className="btn-sample" onClick={loadSample}>
          Or load sample data (5 companies)
        </button>
      )}
    </div>
  )
}
