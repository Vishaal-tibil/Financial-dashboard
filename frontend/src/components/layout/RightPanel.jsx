import AiInsightsPanel  from '../ai-insights/AiInsightsPanel'
import AiAssistantPanel from '../ai-assistant/AiAssistantPanel'

export default function RightPanel() {
  return (
    <aside className="right-panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* AI Insights — purple border, capped height so assistant stays visible */}
      <div style={{
        borderRadius: 10,
        border: '1px solid rgba(124,58,237,0.30)',
        background: 'rgba(124,58,237,0.03)',
        overflowY: 'auto',
        maxHeight: 300,
        flexShrink: 0,
      }}>
        <AiInsightsPanel />
      </div>

      {/* AI Assistant — blue border, takes all remaining space */}
      <div style={{
        borderRadius: 10,
        border: '1px solid rgba(37,99,235,0.30)',
        background: 'rgba(37,99,235,0.025)',
        overflow: 'hidden',
        flex: 1,
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <AiAssistantPanel />
      </div>

    </aside>
  )
}
