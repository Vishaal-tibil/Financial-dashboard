export default function InsightBullet({ text }) {
  return (
    <div className="insight-bullet">
      <div className="insight-dot" />
      <span className="insight-text">{text}</span>
    </div>
  )
}
