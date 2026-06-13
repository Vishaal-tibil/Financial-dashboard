import { useState } from 'react'
import { Download, FileText, Image, ChevronDown, Sparkles } from 'lucide-react'
import { toPng } from 'html-to-image'
import { useApp } from '../../context/AppContext'
import { fyLabel, parseQLabel } from '../../utils/fy'

function shortName(name) {
  if (!name) return ''
  const parts = name.split(' ')
  return parts[0].charAt(0) + parts[0].slice(1).toLowerCase()
}

// ── Competitor add dropdown ────────────────────────────────────────────────
function CompetitorDropdown({ available, onAdd, onClose }) {
  return (
    <div className="topbar-dropdown" style={{ minWidth: 170 }} onMouseLeave={onClose}>
      <div className="topbar-dropdown-label">Add competitor</div>
      {available.map(c => (
        <div
          key={c.name}
          className="topbar-dropdown-option"
          onClick={() => { onAdd(c.name); onClose() }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0, display: 'inline-block' }} />
          <span>{c.name.split(' ').slice(0, 2).join(' ')}</span>
        </div>
      ))}
    </div>
  )
}

// ── FY custom dropdown ─────────────────────────────────────────────────────
function FYDropdown({ selectedFY, selectedYears, latestYear, availableYears, onChange, onClose }) {
  return (
    <div className="topbar-dropdown fy-dropdown" onMouseLeave={onClose}>
      <div className="topbar-dropdown-label">Range</div>
      {[3, 5, 7, 10].map(n => {
        const active = !selectedFY && selectedYears === n
        const sub    = latestYear ? `${fyLabel(latestYear - n + 1)}–${fyLabel(latestYear)}` : null
        return (
          <div
            key={n}
            className={`topbar-dropdown-option${active ? ' active' : ''}`}
            onClick={() => onChange(`r${n}`)}
          >
            <span>Last {n} FY</span>
            {sub && <span className="fy-option-sub">{sub}</span>}
          </div>
        )
      })}
      <div className="topbar-dropdown-divider" />
      <div className="topbar-dropdown-label">Specific Year</div>
      {availableYears.map(y => (
        <div
          key={y}
          className={`topbar-dropdown-option${selectedFY === y ? ' active' : ''}`}
          onClick={() => onChange(String(y))}
        >
          {fyLabel(y)}
        </div>
      ))}
    </div>
  )
}

export default function TopBar() {
  const {
    companies, metrics, meta, primaryCompany,
    selectedCompanies, setSelectedCompanies,
    selectedYears,     setSelectedYears,
    selectedFY,        setSelectedFY,
    selectedQuarter,   setSelectedQuarter,
    panelOpen,         setPanelOpen,
  } = useApp()

  const [showDlMenu,  setShowDlMenu]  = useState(false)
  const [showFYMenu,  setShowFYMenu]  = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const primaryObj     = companies.find(c => c.name === primaryCompany)
  const comparisonObjs = companies.filter(c => selectedCompanies.includes(c.name))
  const available      = companies.filter(c => c.name !== primaryCompany && !selectedCompanies.includes(c.name))

  const availableYears = [...(meta?.years || [])].reverse()
  const primaryM       = metrics[primaryCompany] || {}
  const qFYEndYears    = new Set((primaryM.q_labels || []).map(l => parseQLabel(l).fyEndYear))
  const hasQData       = selectedFY ? qFYEndYears.has(selectedFY) : false
  const latestYear     = meta?.latest_year

  const fyDisplay = selectedFY ? fyLabel(selectedFY) : `Last ${selectedYears} FY`
  const dlFilename = selectedFY ? `fincompare_${fyLabel(selectedFY)}` : `fincompare_last${selectedYears}FY`

  function handleFYChange(val) {
    if (val.startsWith('r')) {
      setSelectedFY(null)
      setSelectedQuarter(null)
      setSelectedYears(Number(val.slice(1)))
    } else {
      setSelectedFY(Number(val))
      setSelectedQuarter(null)
    }
    setShowFYMenu(false)
  }

  function addCompetitor(name) {
    if (name) setSelectedCompanies(prev => [...prev, name])
  }

  function removeCompetitor(name) {
    setSelectedCompanies(prev => prev.filter(c => c !== name))
  }

  // ── PNG capture ────────────────────────────────────────────────────────────
  async function handleDownloadImage() {
    setShowDlMenu(false)
    const pageEl    = document.querySelector('.page-content')
    const panelEl   = document.querySelector('.content-with-panel')
    const wrapperEl = document.querySelector('.main-wrapper')
    if (!pageEl) return

    function expand(el, styles) {
      const saved = {}
      for (const k of Object.keys(styles)) { saved[k] = el.style[k]; el.style[k] = styles[k] }
      return saved
    }
    function restore(el, saved) { if (el && saved) Object.assign(el.style, saved) }

    const s1 = expand(pageEl,    { overflow: 'visible', height: pageEl.scrollHeight + 'px', maxHeight: 'none' })
    const s2 = panelEl   ? expand(panelEl,   { overflow: 'visible' }) : null
    const s3 = wrapperEl ? expand(wrapperEl, { overflow: 'visible' }) : null

    await new Promise(r => setTimeout(r, 60))
    const fullW = pageEl.scrollWidth
    const fullH = pageEl.scrollHeight

    try {
      await toPng(pageEl, { pixelRatio: 2 })
      const dataUrl = await toPng(pageEl, { pixelRatio: 2, width: fullW, height: fullH })
      const a = document.createElement('a')
      a.href = dataUrl; a.download = `${dlFilename}.png`; a.click()
    } catch (err) {
      console.error('Image capture failed:', err)
    } finally {
      restore(pageEl, s1); restore(panelEl, s2); restore(wrapperEl, s3)
    }
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  const ANNUAL_COLS = [
    { key: 'sales',         label: 'Revenue (₹Cr)'           },
    { key: 'ebitda_margin', label: 'EBITDA Margin (%)'       },
    { key: 'op_margin',     label: 'EBIT Margin (%)'         },
    { key: 'net_margin',    label: 'Net Margin (%)'          },
    { key: 'roce',          label: 'ROCE (%)'                },
    { key: 'roe',           label: 'ROE (%)'                 },
    { key: 'debt_equity',   label: 'D/E Ratio'               },
    { key: 'asset_turn',    label: 'Asset Turnover'          },
    { key: 'inv_days',      label: 'Inventory Days'          },
    { key: 'debtor_days',   label: 'Debtor Days'             },
    { key: 'ccc',           label: 'Cash Conv. Cycle (days)' },
    { key: 'inv_turns',     label: 'Inventory Turns'         },
    { key: 'fcf',           label: 'FCF (₹Cr)'              },
    { key: 'cfo',           label: 'CFO (₹Cr)'              },
    { key: 'capex',         label: 'CapEx (₹Cr)'            },
  ]

  function handleDownload() {
    setShowDlMenu(false)
    const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
    const exportYears  = selectedFY ? [selectedFY] : (primaryM.years || []).slice(-selectedYears)

    const csvCell = v => { const s = String(v ?? ''); return s.includes(',') ? `"${s}"` : s }
    const row     = cells => cells.map(csvCell).join(',')
    const lines   = []

    lines.push(row(['Company', 'FY', ...ANNUAL_COLS.map(c => c.label)]))
    for (const name of visibleNames) {
      const m    = metrics[name] || {}
      const yrs  = m.years || []
      const yMap = Object.fromEntries(yrs.map((y, i) => [y, i]))
      for (const year of exportYears) {
        const idx = yMap[year]
        if (idx === undefined) continue
        lines.push(row([name, fyLabel(year), ...ANNUAL_COLS.map(col => m[col.key]?.[idx] ?? '')]))
      }
    }

    if (selectedFY && hasQData) {
      lines.push('', row(['--- Quarterly Data ---']))
      lines.push(row(['Company', 'FY', 'Quarter', 'Revenue (₹Cr)', 'Op Profit (₹Cr)', 'Net Profit (₹Cr)', 'OPM (%)']))
      for (const name of visibleNames) {
        const m     = metrics[name] || {}
        const qLbls = m.q_labels || []
        qLbls
          .map((lbl, i) => { const p = parseQLabel(lbl); return { ...p, i } })
          .filter(q => q.fyEndYear === selectedFY && (!selectedQuarter || q.quarter === selectedQuarter))
          .sort((a, b) => a.quarter - b.quarter)
          .forEach(({ quarter, i }) => {
            lines.push(row([name, fyLabel(selectedFY), `Q${quarter}`, m.q_sales?.[i] ?? '', m.q_op?.[i] ?? '', m.q_net?.[i] ?? '', m.q_opm?.[i] ?? '']))
          })
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${dlFilename}.csv`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <header className="topbar">

      {/* ── Zone 1: Primary company ── */}
      {primaryObj && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: primaryObj.color, flexShrink: 0, display: 'inline-block' }} />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {shortName(primaryObj.name)}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>Primary</div>
          </div>
        </div>
      )}

      <div className="topbar-divider" />

      {/* ── Zone 2: Competitors ── */}
      <div className="topbar-comparing">
        {comparisonObjs.length > 0 && (
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0, fontWeight: 500 }}>vs</span>
        )}

        <div className="company-chips">
          {comparisonObjs.map(c => (
            <span
              key={c.name}
              className="chip"
              title={c.name}
              style={{ borderColor: `${c.color}55`, color: c.color, background: `${c.color}12` }}
            >
              <span className="chip-dot" style={{ background: c.color }} />
              {shortName(c.name)}
              <span className="chip-x" onClick={() => removeCompetitor(c.name)}>✕</span>
            </span>
          ))}
        </div>

        {/* Add competitor — full CTA when empty, small + chip when peers exist */}
        {available.length > 0 && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {comparisonObjs.length === 0 ? (
              <button
                className="btn-add-peer"
                onClick={() => setShowAddMenu(m => !m)}
              >
                + Add Competitor
              </button>
            ) : (
              <button
                className="btn-add-peer-small"
                onClick={() => setShowAddMenu(m => !m)}
                title="Add competitor"
              >
                +
              </button>
            )}
            {showAddMenu && (
              <CompetitorDropdown
                available={available}
                onAdd={addCompetitor}
                onClose={() => setShowAddMenu(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Zone 3: Filters + Actions ── */}
      <div className="topbar-right">

        {/* FY custom dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className={`fy-trigger${showFYMenu ? ' open' : ''}`}
            onClick={() => { setShowFYMenu(m => !m); setShowDlMenu(false) }}
          >
            {fyDisplay}
            <ChevronDown size={11} className="fy-chevron" />
          </button>
          {showFYMenu && (
            <FYDropdown
              selectedFY={selectedFY}
              selectedYears={selectedYears}
              latestYear={latestYear}
              availableYears={availableYears}
              onChange={handleFYChange}
              onClose={() => setShowFYMenu(false)}
            />
          )}
        </div>

        {/* Quarter pills — visible whenever a specific FY is pinned */}
        {selectedFY && (
          <div className="quarter-pills">
            {[
              { v: null, l: 'All' },
              { v: 1,    l: 'Q1'  },
              { v: 2,    l: 'Q2'  },
              { v: 3,    l: 'Q3'  },
              { v: 4,    l: 'Q4'  },
            ].map(q => {
              const disabled = q.v !== null && !hasQData
              return (
                <button
                  key={q.l}
                  className={`quarter-pill${selectedQuarter === q.v ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                  onClick={() => !disabled && setSelectedQuarter(q.v)}
                  title={disabled ? 'No quarterly data for this FY' : undefined}
                >
                  {q.l}
                </button>
              )
            })}
          </div>
        )}

        {/* Export dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-download"
            onClick={() => { setShowDlMenu(m => !m); setShowFYMenu(false) }}
          >
            <Download size={12} />
            Export
            <span style={{ fontSize: 8, marginLeft: 2, opacity: 0.7 }}>▾</span>
          </button>
          {showDlMenu && (
            <div
              onMouseLeave={() => setShowDlMenu(false)}
              className="topbar-dropdown"
              style={{ minWidth: 155, right: 0 }}
            >
              {[
                { label: 'CSV Data',  icon: FileText, action: handleDownload      },
                { label: 'PNG Image', icon: Image,    action: handleDownloadImage },
              ].map(({ label, icon: Icon, action }) => (
                <div key={label} className="topbar-dropdown-option" onClick={action}>
                  <Icon size={13} style={{ opacity: 0.65 }} />
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Panel toggle */}
        <button
          className={`btn-ai-toggle${panelOpen ? ' open' : ''}`}
          onClick={() => setPanelOpen(p => !p)}
          title={panelOpen ? 'Close AI panel' : 'Open AI panel'}
        >
          <Sparkles size={12} />
          AI
        </button>

      </div>

    </header>
  )
}
