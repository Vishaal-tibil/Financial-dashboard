import { Bar } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext'

export default function FCFvsCapexChart() {
  const { companies, metrics, primaryCompany, selectedCompanies, selectedYears } = useApp()
  const visibleNames = [primaryCompany, ...selectedCompanies].filter(Boolean)
  const visible      = companies.filter(c => visibleNames.includes(c.name))

  // Use latest year for each company
  const labels = visible.map(c => c.name.split(' ')[0])

  function latestVal(companyName, seriesKey) {
    const m    = metrics[companyName] || {}
    const vals = m[seriesKey] || []
    const valid = vals.filter(v => v != null)
    return valid.length ? valid[valid.length - 1] : 0
  }

  const fcfData   = visible.map(c => latestVal(c.name, 'fcf'))
  const capexData = visible.map(c => latestVal(c.name, 'capex'))

  const data = {
    labels,
    datasets: [
      {
        label:           'FCF',
        data:            fcfData,
        backgroundColor: visible.map(c => `${c.color}cc`),
        borderRadius:    4,
        barPercentage:   0.4,
      },
      {
        label:           'CapEx',
        data:            capexData,
        backgroundColor: visible.map(c => `${c.color}44`),
        borderRadius:    4,
        barPercentage:   0.4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 10 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { font: { size: 10 }, callback: v => `₹${v} Cr` },
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">FCF vs CapEx (Latest Year, ₹ Cr)</span>
      </div>
      <div className="chart-canvas-wrap" style={{ height: 200 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}
