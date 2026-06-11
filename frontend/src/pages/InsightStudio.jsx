import { useState } from 'react'
import { FileText, Sparkles, RefreshCw, Download, ChevronDown, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'

const REPORT_TYPES = [
  { value: 'executive_summary',  label: 'Executive Summary',          desc: 'C-suite overview with verdict and top/bottom performers' },
  { value: 'peer_benchmarking',  label: 'Peer Benchmarking',          desc: 'Side-by-side rankings across profitability, ops, valuation' },
  { value: 'trend_analysis',     label: 'Trend Analysis',             desc: 'Multi-year trajectories — revenue, margins, balance sheet' },
  { value: 'capital_efficiency', label: 'Capital Efficiency Deep Dive', desc: 'ROCE, FCF quality, CapEx deployment, asset utilisation' },
]

const YEAR_OPTIONS = [
  { value: 'Last 3 Years', label: 'Last 3 Years' },
  { value: 'Last 5 Years', label: 'Last 5 Years' },
  { value: 'Last 7 Years', label: 'Last 7 Years' },
  { value: 'Last 10 Years', label: 'Last 10 Years' },
]

function ReportSection({ heading, bullets, expanded, onToggle }) {
  return (
    <div style={{ borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8, overflow: 'hidden' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', cursor: 'pointer', background: 'var(--bg-card-2)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{heading}</span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>
      {expanded && (
        <div style={{ padding: '10px 14px', background: 'var(--bg-card)' }}>
          {(bullets || []).map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{b}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VerdictCard({ verdict, topPerformer, watchOut }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(8,145,178,0.06))',
      border: '1px solid var(--border-accent)', borderRadius: 10, padding: '14px 16px', marginBottom: 16,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Verdict</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 10 }}>{verdict}</div>
      <div style={{ display: 'flex', gap: 16 }}>
        {topPerformer && (
          <div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Top Performer</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{topPerformer}</div>
          </div>
        )}
        {watchOut && (
          <div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Watch Out</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>{watchOut}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InsightStudio() {
  const { companies, primaryCompany, selectedCompanies, meta } = useApp()
  const allVisible = [primaryCompany, ...selectedCompanies].filter(Boolean)

  const [reportType,     setReportType]     = useState('executive_summary')
  const [period,         setPeriod]         = useState('Last 5 Years')
  const [selCompanies,   setSelCompanies]   = useState(allVisible)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [report,         setReport]         = useState(null)
  const [expandedSecs,   setExpandedSecs]   = useState({})

  function toggleCompany(name) {
    setSelCompanies(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  function toggleSection(heading) {
    setExpandedSecs(prev => ({ ...prev, [heading]: !prev[heading] }))
  }

  async function generateReport() {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: reportType, companies: selCompanies, period }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      setReport(data)
      // Expand all sections by default
      const expanded = {}
      ;(data.sections || []).forEach(s => { expanded[s.heading] = true })
      setExpandedSecs(expanded)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function printReport() {
    window.print()
  }

  const chosenType = REPORT_TYPES.find(t => t.value === reportType)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Insight Studio</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI-powered financial report generation</div>
        </div>
      </div>

      {/* Config panel + Report output */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Config panel ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Report Configuration
          </div>

          {/* Report type */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Report Type</label>
            {REPORT_TYPES.map(t => (
              <div
                key={t.value}
                onClick={() => setReportType(t.value)}
                style={{
                  padding: '8px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 4,
                  background: reportType === t.value ? 'rgba(37,99,235,0.08)' : 'transparent',
                  border: `1px solid ${reportType === t.value ? 'var(--border-accent)' : 'transparent'}`,
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: reportType === t.value ? 'var(--accent)' : 'var(--text-primary)' }}>{t.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{t.desc}</div>
              </div>
            ))}
          </div>

          {/* Period */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Period</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {YEAR_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setPeriod(o.value)}
                  style={{
                    padding: '4px 10px', borderRadius: 100, fontSize: 11, cursor: 'pointer',
                    background: period === o.value ? 'var(--accent)' : 'transparent',
                    color: period === o.value ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${period === o.value ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {o.label.replace('Last ', '').replace(' Years', 'Y')}
                </button>
              ))}
            </div>
          </div>

          {/* Companies */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Companies</label>
            {companies.map(c => (
              <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selCompanies.includes(c.name)}
                  onChange={() => toggleCompany(c.name)}
                  style={{ accentColor: c.color }}
                />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.name.split(' ')[0]}</span>
              </label>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={generateReport}
            disabled={loading || selCompanies.length === 0}
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: 'var(--accent)', border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: (loading || selCompanies.length === 0) ? 0.6 : 1,
            }}
          >
            {loading ? (
              <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
            ) : (
              <><Sparkles size={13} /> Generate Report</>
            )}
          </button>
        </div>

        {/* ── Report output ── */}
        <div>
          {!report && !loading && !error && (
            <div style={{
              background: 'var(--bg-card)', border: '2px dashed var(--border)',
              borderRadius: 10, padding: 48, textAlign: 'center',
            }}>
              <FileText size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Configure your report and click Generate</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, opacity: 0.7 }}>
                Powered by Qwen3 — analyses all loaded company data
              </div>
            </div>
          )}

          {loading && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 48, textAlign: 'center',
            }}>
              <RefreshCw size={24} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Qwen is analysing {selCompanies.length} companies…
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Generating {chosenType?.label}</div>
            </div>
          )}

          {error && !loading && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 20,
            }}>
              <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</div>
              <button onClick={generateReport} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          )}

          {report && !loading && (
            <div className="report-output" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              {/* Report title + actions */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{report.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={printReport}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', background: 'transparent',
                    border: '1px solid var(--border)', borderRadius: 7,
                    fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  <Download size={12} /> Export
                </button>
              </div>

              {/* Verdict */}
              {report.verdict && (
                <VerdictCard
                  verdict={report.verdict}
                  topPerformer={report.top_performer}
                  watchOut={report.watch_out}
                />
              )}

              {/* Sections */}
              {(report.sections || []).map(sec => (
                <ReportSection
                  key={sec.heading}
                  heading={sec.heading}
                  bullets={sec.bullets}
                  expanded={expandedSecs[sec.heading] !== false}
                  onToggle={() => toggleSection(sec.heading)}
                />
              ))}

              {/* Re-generate */}
              <button
                onClick={generateReport}
                style={{
                  marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', background: 'transparent',
                  border: '1px solid var(--border-accent)', borderRadius: 7,
                  fontSize: 11, color: 'var(--accent)', cursor: 'pointer',
                }}
              >
                <RefreshCw size={11} /> Regenerate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
