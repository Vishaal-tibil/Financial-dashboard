import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, BarElement,
  RadialLinearScale, ArcElement, Filler,
  Tooltip, Legend,
} from 'chart.js'
import App from './App.jsx'
import './styles/typography.css'
import './styles/globals.css'

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, BarElement,
  RadialLinearScale, ArcElement, Filler,
  Tooltip, Legend,
)

// Global Chart.js defaults — dark theme
ChartJS.defaults.color           = '#94a3b8'
ChartJS.defaults.borderColor     = 'rgba(255,255,255,0.06)'
ChartJS.defaults.font.family     = 'Inter, system-ui, sans-serif'
ChartJS.defaults.font.size       = 11
ChartJS.defaults.plugins.legend.labels.boxWidth  = 10
ChartJS.defaults.plugins.legend.labels.padding   = 14
ChartJS.defaults.plugins.tooltip.backgroundColor = '#0f1628'
ChartJS.defaults.plugins.tooltip.borderColor     = 'rgba(255,255,255,0.1)'
ChartJS.defaults.plugins.tooltip.borderWidth     = 1
ChartJS.defaults.plugins.tooltip.titleColor      = '#e2e8f0'
ChartJS.defaults.plugins.tooltip.bodyColor       = '#94a3b8'
ChartJS.defaults.plugins.tooltip.padding         = 10

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
