// FY label convention: stored year = fiscal year END (March); display FY = start year
// e.g. stored 2026 (Mar-2026) → FY25 (April 2025 – March 2026)
export const fyLabel = year => `FY${String(year - 1).slice(2)}`

const MONTH = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 }

// Parse "Jun'25" → { month, calYear, fyEndYear (stored int key), quarter (1–4) }
export function parseQLabel(label) {
  const [mon, yr] = label.split("'")
  const m = MONTH[mon]
  const y = 2000 + parseInt(yr, 10)
  return {
    month:     m,
    calYear:   y,
    fyEndYear: m <= 3 ? y : y + 1,       // Mar'26 → 2026, Jun'25 → 2026
    quarter:   m <= 3 ? 4 : m <= 6 ? 1 : m <= 9 ? 2 : 3,
  }
}

// Get last non-null value for a metric within a year window from metrics data
export function getWindowVal(metricsData, companyName, key, yearWindow) {
  const m    = metricsData[companyName] || {}
  const yrs  = m.years || []
  const yMap = Object.fromEntries(yrs.map((y, i) => [y, i]))
  for (let i = yearWindow.length - 1; i >= 0; i--) {
    const idx = yMap[yearWindow[i]]
    if (idx !== undefined && m[key]?.[idx] != null) return m[key][idx]
  }
  return null
}

// Shared bar-chart options for cross-sectional company comparisons
export function barOptions({ yLabel = '', pctY = false, crY = false } = {}) {
  return {
    responsive:          true,
    maintainAspectRatio: false,
    interaction:         { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 10 } } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        grid:  { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          font:     { size: 10 },
          callback: crY  ? v => `₹${(v / 1000).toFixed(1)}k`
                  : pctY ? v => `${v}%`
                  : v => v,
        },
      },
    },
  }
}
