import { useState } from 'react'

export default function CheckInOverlay({ signals, onComplete }) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})

  // signals is already a 2-item array picked by ActiveSession
  const current = signals[idx]

  function handleAnswer(key, answer) {
    const next = { ...answers, [key]: answer }
    setAnswers(next)

    if (idx + 1 < signals.length) {
      setTimeout(() => setIdx(i => i + 1), 220)
    } else {
      setTimeout(() => {
        const yesCount = Object.values(next).filter(Boolean).length
        onComplete({
          groundedScore: 5,   // neutral default — no longer asked
          yesCount,
          signalKeys: signals.map(s => s.key),
          signalAnswers: next,
        })
      }, 220)
    }
  }

  if (!current) return null

  return (
    <div className="overlay">
      <div className="overlay-panel">
        <div className="fade-in" key={idx}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
            {idx + 1} of {signals.length}
          </p>
          <h3 style={{ fontSize: 17, marginBottom: 32, fontWeight: 400, lineHeight: 1.5 }}>
            {current.question}
          </h3>
          <div className="yn-row">
            <button
              className={`yn-btn ${answers[current.key] === false ? 'selected' : ''}`}
              onClick={() => handleAnswer(current.key, false)}
            >
              no
            </button>
            <button
              className={`yn-btn yes ${answers[current.key] === true ? 'selected' : ''}`}
              onClick={() => handleAnswer(current.key, true)}
            >
              yes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
