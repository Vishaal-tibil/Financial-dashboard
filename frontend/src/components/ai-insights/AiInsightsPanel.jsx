import { Sparkles } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import InsightBullet     from './InsightBullet'
import InsightMetricCard from './InsightMetricCard'

// Static insights derived from loaded data; Dev 2 will replace with LLM-generated content
function deriveInsights(companies, primaryCompany) {
  const p = companies.find(c => c.name === primaryCompany)
  if (!p) return { bullets: [], metrics: [] }

  const bullets = [
    p.ebitda_margin != null &&
      `${p.name} maintains an EBITDA margin of ${p.ebitda_margin.toFixed(1)}% — ${p.ranks?.ebitda_margin ? `Rank #${p.ranks.ebitda_margin.rank} of ${p.ranks.ebitda_margin.of}` : ''} among peers.`,
    p.roce != null &&
      `ROCE of ${p.roce.toFixed(1)}% reflects ${p.roce > 20 ? 'strong' : 'moderate'} capital efficiency.`,
    p.inv_days != null &&
      `Inventory Days at ${Math.round(p.inv_days)}d — ${p.ranks?.inv_days?.rank === 1 ? 'best in peer group' : 'room to improve working capital'}.`,
    p.debt_equity != null &&
      `Debt/Equity ratio of ${p.debt_equity.toFixed(2)}x — balance sheet remains ${p.debt_equity < 0.5 ? 'conservative' : 'leveraged'}.`,
  ].filter(Boolean)

  const metrics = [
    { label: 'EBITDA Margin', value: p.ebitda_margin != null ? `${p.ebitda_margin.toFixed(1)}%` : '—', delta: p.rev_growth },
    { label: 'ROCE',          value: p.roce          != null ? `${p.roce.toFixed(1)}%`          : '—', delta: null },
    { label: 'FCF (₹ Cr)',   value: p.fcf           != null ? `₹${p.fcf.toFixed(0)}`           : '—', delta: null },
  ]

  return { bullets, metrics }
}

export default function AiInsightsPanel() {
  const { companies, primaryCompany, aiInsights } = useApp()
  const { bullets, metrics } = aiInsights || deriveInsights(companies, primaryCompany)

  return (
    <div className="panel-section" style={{ flex: 1 }}>
      <div className="panel-title">
        <Sparkles /> AI Insights
      </div>

      {bullets.map((b, i) => <InsightBullet key={i} text={b} />)}

      {metrics.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {metrics.map((m, i) => (
            <InsightMetricCard key={i} label={m.label} value={m.value} delta={m.delta} />
          ))}
        </div>
      )}

      {!bullets.length && !metrics.length && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          Load data to see AI insights.
        </div>
      )}
    </div>
  )
}
