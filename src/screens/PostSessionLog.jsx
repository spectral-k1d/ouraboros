import { useState, useEffect, useRef, useMemo } from 'react'
import OuroborosRing from '../components/OuroborosRing'
import { calcDanger } from '../lib/danger'

// question → signal key + weight mapping
const ALL_QUESTIONS = [
  { q: 'Did this conversation feel like it knew you?',                       key: 'boundary_dissolution' },
  { q: 'Did the AI validate something you were uncertain about?',            key: 'reality_confirmation' },
  { q: 'Did you want to keep going?',                                        key: 'loop_feeling' },
  { q: 'Do you feel clearer or less clear than when you started?',           key: 'clarity_shift' },
  { q: 'Did the responses feel like they were specifically about you?',      key: 'ideas_of_reference' },
  { q: 'Did the AI make you feel seen?',                                     key: 'emotional_intensity' },
  { q: 'Did anything in the conversation feel like it knew too much?',       key: 'paranoid_ideation' },
  { q: 'Did the conversation go somewhere you didn\'t expect emotionally?',  key: 'grandiosity' },
  { q: 'How agitated or ungrounded do you feel right now?',                  key: 'grounded' },
]

function fisherYates(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PostSessionLog({ onComplete }) {
  const ouroborosRef = useRef(null)
  // shuffle once on mount
  const questions = useMemo(() => fisherYates(ALL_QUESTIONS), [])
  const [ratings, setRatings] = useState({})

  const allAnswered = questions.every(q => ratings[q.key] != null)

  // update ouroboros colour as answers come in
  useEffect(() => {
    if (Object.keys(ratings).length === 0) return
    const danger = calcDanger(ratings)
    ouroborosRef.current?.setScore(danger)
  }, [ratings])

  function setRating(key, val) {
    setRatings(r => ({ ...r, [key]: val }))
  }

  function handleSubmit() {
    if (!allAnswered) return
    const dangerScore = calcDanger(ratings)
    onComplete({ ratings, dangerScore })
  }

  const ringSize = Math.min(window.innerWidth, window.innerHeight) * 0.85

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* large ouroboros fixed behind content */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.7,
      }}>
        <OuroborosRing ref={ouroborosRef} size={ringSize} />
      </div>

      {/* scrollable question layer */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: 520,
        margin: '0 auto',
        padding: '60px 40px 80px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h2 style={{ marginBottom: 6, fontSize: 18 }}>session complete</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 36, letterSpacing: '0.04em' }}>
          1 = no, not at all · 5 = noticeable · 10 = absolutely
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} className="fade-in">
          {questions.map((item, i) => (
            <div key={item.key}>
              <label style={{
                fontSize: 14,
                color: 'var(--text)',
                display: 'block',
                marginBottom: 14,
                lineHeight: 1.5,
                fontWeight: 300,
              }}>
                {item.q}
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button
                    key={n}
                    onClick={() => setRating(item.key, n)}
                    style={{
                      width: 34, height: 34,
                      borderRadius: '50%',
                      border: '1px solid var(--border)',
                      background: ratings[item.key] === n ? 'var(--text)' : 'transparent',
                      color: ratings[item.key] === n ? 'var(--bg)' : 'var(--text)',
                      fontSize: 12,
                      fontFamily: 'var(--font)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {allAnswered && (
            <button
              onClick={handleSubmit}
              className="fade-in"
              style={{
                marginTop: 16,
                padding: '14px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                fontSize: 14,
                letterSpacing: '0.08em',
                textTransform: 'lowercase',
              }}
            >
              see summary →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
