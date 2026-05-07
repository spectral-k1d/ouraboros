import { useState } from 'react'
import Ouroboros from '../components/Ouroboros'

const SIGNALS_LOG = [
  { key: 'boundary_dissolution', label: 'boundary dissolution' },
  { key: 'reality_confirmation', label: 'reality confirmation' },
  { key: 'loop_feeling', label: 'loop feeling' },
  { key: 'clarity_shift', label: 'clarity shift' },
  { key: 'ideas_of_reference', label: 'ideas of reference' },
  { key: 'grandiosity', label: 'grandiosity' },
  { key: 'paranoid_ideation', label: 'paranoid ideation' },
  { key: 'emotional_intensity', label: 'emotional intensity' },
]

const PLATFORMS = ['ChatGPT', 'Claude', 'Gemini', 'Grok', 'Other']
const TOPICS = ['work', 'creative', 'personal', 'research', 'other']

export default function PostSessionLog({ session, lastRisk, onComplete }) {
  const [ratings, setRatings] = useState({})
  const [platform, setPlatform] = useState(session?.platform || '')
  const [topic, setTopic] = useState(session?.topic_category || '')

  function setRating(key, val) {
    setRatings(r => ({ ...r, [key]: val }))
  }

  const allRated = SIGNALS_LOG.every(s => ratings[s.key])

  function handleSubmit() {
    if (!allRated) return
    onComplete({ ratings, platform, topic })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '48px 40px',
      maxWidth: 560,
      margin: '0 auto',
    }}>
      {/* small ouroboros */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
        <Ouroboros risk={lastRisk} small />
      </div>

      <h2 style={{ marginBottom: 6, fontSize: 18 }}>session complete</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 36 }}>
        rate how present each of these felt during the session.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="fade-in">
        {SIGNALS_LOG.map(sig => (
          <div key={sig.key}>
            <label style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: 10,
              letterSpacing: '0.04em',
            }}>
              {sig.label}
            </label>
            <div className="circle-row">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  className={`circle-btn ${ratings[sig.key] === n ? 'selected' : ''}`}
                  onClick={() => setRating(sig.key, n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              platform
            </label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}>
              <option value="">select</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              topic
            </label>
            <select value={topic} onChange={e => setTopic(e.target.value)}>
              <option value="">select</option>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allRated}
          style={{
            marginTop: 16,
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 14,
            letterSpacing: '0.08em',
            textTransform: 'lowercase',
            opacity: allRated ? 1 : 0.4,
            cursor: allRated ? 'pointer' : 'not-allowed',
          }}
        >
          view summary
        </button>
      </div>
    </div>
  )
}
