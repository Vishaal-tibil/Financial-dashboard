import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, BarElement, BarController, BubbleController, ScatterController,
  RadialLinearScale, ArcElement, Filler,
  Tooltip, Legend,
} from 'chart.js'
import App from './App.jsx'
import './styles/typography.css'
import './styles/globals.css'

// In production (Firebase Hosting), VITE_API_URL is set to the EC2 backend URL.
// Intercepts /api/* fetches and prepends the full EC2 origin so the built frontend
// reaches the EC2 instance. In development this env var is unset, so Vite's proxy
// handles /api/* as usual — no code change needed in any component.
const _API_BASE = import.meta.env.VITE_API_URL || ''
if (_API_BASE) {
  const _origFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return _origFetch(_API_BASE + input, init)
    }
    return _origFetch(input, init)
  }
}

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, BarElement, BarController, BubbleController, ScatterController,
  RadialLinearScale, ArcElement, Filler,
  Tooltip, Legend,
)

// Global Chart.js defaults — light theme
ChartJS.defaults.animation.duration = 600
ChartJS.defaults.animation.easing   = 'easeInOutQuart'
ChartJS.defaults.color           = '#475569'
ChartJS.defaults.borderColor     = 'rgba(0,0,0,0.07)'
ChartJS.defaults.font.family     = 'Inter, system-ui, sans-serif'
ChartJS.defaults.font.size       = 11
ChartJS.defaults.plugins.legend.labels.boxWidth  = 10
ChartJS.defaults.plugins.legend.labels.padding   = 14
ChartJS.defaults.plugins.tooltip.backgroundColor = '#1e293b'
ChartJS.defaults.plugins.tooltip.borderColor     = 'rgba(0,0,0,0.15)'
ChartJS.defaults.plugins.tooltip.borderWidth     = 1
ChartJS.defaults.plugins.tooltip.titleColor      = '#f1f5f9'
ChartJS.defaults.plugins.tooltip.bodyColor       = '#94a3b8'
ChartJS.defaults.plugins.tooltip.padding         = 10

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
