import AiInsightsPanel from '../ai-insights/AiInsightsPanel'

// Dev 2 will add AiAssistantPanel below AiInsightsPanel
// import AiAssistantPanel from '../ai-assistant/AiAssistantPanel'

export default function RightPanel() {
  return (
    <aside className="right-panel">
      <AiInsightsPanel />
      {/* <AiAssistantPanel /> */}
    </aside>
  )
}
