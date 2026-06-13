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

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, BarElement, BarController, BubbleController, ScatterController,
  RadialLinearScale, ArcElement, Filler,
  Tooltip, Legend,
)

// Global Chart.js defaults — light theme
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
