import { useState } from 'react'

const PLATFORMS = ['ChatGPT', 'Claude', 'Gemini', 'Grok', 'Other']
const TOPICS = ['work', 'creative', 'personal', 'research', 'other']

export default function SessionStart({ onStart }) {
  const [platform, setPlatform] = useState('')
  const [topic, setTopic] = useState('')

  function handleStart(e) {
    e.preventDefault()
    if (!platform || !topic) return
    onStart({ platform, topic_category: topic })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    }}>
      <div style={{ maxWidth: 380, width: '100%' }} className="fade-in">
        <h2 style={{ marginBottom: 6, fontSize: 18 }}>new session</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
          which ai are you opening, and what for?
        </p>

        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              platform
            </label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} required>
              <option value="">select platform</option>
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              topic
            </label>
            <select value={topic} onChange={e => setTopic(e.target.value)} required>
              <option value="">select topic</option>
              {TOPICS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            style={{
              marginTop: 8,
              padding: '12px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--text)',
              fontSize: 14,
              letterSpacing: '0.08em',
            }}
          >
            begin session
          </button>
        </form>
      </div>
    </div>
  )
}
