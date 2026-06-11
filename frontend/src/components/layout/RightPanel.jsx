import AiInsightsPanel from '../ai-insights/AiInsightsPanel'
import { Bot } from 'lucide-react'

// Dev 2 will replace the placeholder below with their AiAssistantPanel component
// import AiAssistantPanel from '../ai-assistant/AiAssistantPanel'

function AiAssistantPlaceholder() {
  return (
    <div className="panel-section panel-half">
      <div className="panel-title">
        <Bot size={13} /> AI Assistant
      </div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        color: 'var(--text-muted)', fontSize: 11, textAlign: 'center',
        padding: '0 12px',
      }}>
        <Bot size={28} style={{ opacity: 0.25 }} />
        <span>AI Assistant</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>Chat with your financial data</span>
        <div style={{
          width: '100%', marginTop: 8,
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6,
          opacity: 0.4, background: 'var(--bg-base)',
        }}>
          <span style={{ flex: 1, fontSize: 11 }}>Ask anything…</span>
          <span style={{ fontSize: 14 }}>↑</span>
        </div>
      </div>
    </div>
  )
}

export default function RightPanel() {
  return (
    <aside className="right-panel">
      <AiInsightsPanel />
      <AiAssistantPlaceholder />
    </aside>
  )
}
