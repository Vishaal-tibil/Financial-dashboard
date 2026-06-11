import { Download, PlusCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'

function shortName(name) {
  if (!name) return ''
  // "CARBORUNDUM UNIVERSAL LTD" → "Carborundum"
  const first = name.split(' ')[0]
  return first.charAt(0) + first.slice(1).toLowerCase()
}

export default function TopBar() {
  const {
    companies, primaryCompany, setPrimaryCompany,
    selectedCompanies, setSelectedCompanies,
    selectedYears, setSelectedYears, meta,
    navigate,
  } = useApp()

  const allComps       = companies.filter(c => c.name !== primaryCompany)
  const primaryObj     = companies.find(c => c.name === primaryCompany)
  const comparisonObjs = companies.filter(c => selectedCompanies.includes(c.name))

  const YEAR_OPTIONS = [3, 5, 7, 10]

  function removeComparison(name) {
    setSelectedCompanies(prev => prev.filter(c => c !== name))
  }

  function addNextCompany() {
    const unused = allComps.find(c => !selectedCompanies.includes(c.name))
    if (unused) setSelectedCompanies(prev => [...prev, unused.name])
  }

  const latestYear = meta?.latest_year
  const startYear  = latestYear ? latestYear - selectedYears + 1 : null

  return (
    <header className="topbar">
      {/* Title */}
      <div className="topbar-title-block">
        <span className="topbar-title">Executive Cockpit</span>
        {primaryObj && (
          <span className="topbar-company" title={primaryObj.name}>
            {shortName(primaryObj.name)}
          </span>
        )}
      </div>

      <div className="topbar-divider" />

      {/* Comparing with — horizontally scrollable chips */}
      <div className="topbar-comparing">
        <span className="comparing-label">Comparing:</span>
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
              <span className="chip-x" onClick={() => removeComparison(c.name)}>✕</span>
            </span>
          ))}
          {allComps.length > comparisonObjs.length && (
            <button className="chip-add" onClick={addNextCompany}>+ Add</button>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="topbar-right">
        {/* Add Company (upload new Excel) */}
        <button
          className="btn-add-company"
          onClick={() => navigate('upload')}
          title="Upload a new company Excel file"
        >
          <PlusCircle size={13} />
          Add Company
        </button>

        {/* Year selector */}
        <select
          className="year-badge"
          value={selectedYears}
          onChange={e => setSelectedYears(Number(e.target.value))}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          {YEAR_OPTIONS.map(y => (
            <option key={y} value={y} style={{ background: '#1e293b' }}>
              {latestYear
                ? `Last ${y} Yrs (FY${String(latestYear - y + 1).slice(2)}–FY${String(latestYear).slice(2)})`
                : `Last ${y} Years`}
            </option>
          ))}
        </select>

        <button className="btn-download">
          <Download size={12} />
          Download
        </button>

        <div className="avatar">A</div>
      </div>
    </header>
  )
}
