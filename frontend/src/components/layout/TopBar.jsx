import { Download } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function TopBar() {
  const {
    companies, primaryCompany, setPrimaryCompany,
    selectedCompanies, setSelectedCompanies,
    selectedYears, setSelectedYears, meta,
  } = useApp()

  const allComps      = companies.filter(c => c.name !== primaryCompany)
  const primaryObj    = companies.find(c => c.name === primaryCompany)
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
  const yearLabel  = latestYear
    ? `Last ${selectedYears} Years (FY${String(startYear).slice(2)}–FY${String(latestYear).slice(2)})`
    : `Last ${selectedYears} Years`

  return (
    <header className="topbar">
      {/* Title */}
      <div className="topbar-title-block">
        <span className="topbar-title">Executive Cockpit</span>
        {primaryObj && (
          <span className="topbar-company">{primaryObj.name}</span>
        )}
      </div>

      <div className="topbar-divider" />

      {/* Comparing with chips */}
      <div className="topbar-comparing">
        <span className="comparing-label">Comparing with:</span>
        <div className="company-chips">
          {comparisonObjs.map(c => (
            <span
              key={c.name}
              className="chip"
              style={{ borderColor: `${c.color}44`, color: c.color, background: `${c.color}12` }}
            >
              <span className="chip-dot" style={{ background: c.color }} />
              {c.name}
              <span className="chip-x" onClick={() => removeComparison(c.name)}>✕</span>
            </span>
          ))}
          {selectedCompanies.length < companies.length - 1 && (
            <button className="chip-add" onClick={addNextCompany}>+ Add Competitor</button>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="topbar-right">
        {/* Year selector */}
        <select
          className="year-badge"
          value={selectedYears}
          onChange={e => setSelectedYears(Number(e.target.value))}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          {YEAR_OPTIONS.map(y => (
            <option key={y} value={y} style={{ background: '#0f1628' }}>
              {latestYear
                ? `Last ${y} Years (FY${String(latestYear - y + 1).slice(2)}–FY${String(latestYear).slice(2)})`
                : `Last ${y} Years`}
            </option>
          ))}
        </select>

        <button className="btn-download">
          <Download size={12} />
          Download Report
        </button>

        <div className="avatar">A</div>
      </div>
    </header>
  )
}
