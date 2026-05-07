export default function DraftRecovery({ draft, onRecover, onDiscard }) {
  if (!draft) return null
  const time = draft.startedAt
    ? new Date(draft.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'unknown time'
  const platform = draft.session?.platform || 'session'

  return (
    <div className="overlay">
      <div className="overlay-panel" style={{ maxWidth: 400 }}>
        <h3 style={{ marginBottom: 8, fontSize: 16 }}>unfinished session</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
          you have an unfinished {platform} session from {time}.
          would you like to complete it or discard it?
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onRecover}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontSize: 14,
              letterSpacing: '0.06em',
            }}
          >
            complete it
          </button>
          <button
            onClick={onDiscard}
            style={{
              padding: '12px 20px',
              fontSize: 14,
              color: 'var(--text-muted)',
            }}
          >
            discard
          </button>
        </div>
      </div>
    </div>
  )
}
