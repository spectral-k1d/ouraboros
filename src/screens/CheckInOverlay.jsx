import { useState } from 'react'
import { shouldShowDrift } from '../lib/riskScore'

const STEPS = {
  GROUNDED: 'grounded',
  SIGNALS: 'signals',
  DRIFT: 'drift',
}

export default function CheckInOverlay({ signals, instantRisk, sessionMinutes, onComplete }) {
  const [step, setStep] = useState(STEPS.GROUNDED)
  const [groundedScore, setGroundedScore] = useState(null)
  const [signalAnswers, setSignalAnswers] = useState({}) // key -> bool
  const [driftQ1, setDriftQ1] = useState(null) // still on topic?
  const [driftQ2, setDriftQ2] = useState(null) // could close tab?
  const [currentSignalIdx, setCurrentSignalIdx] = useState(0)

  const showDrift = shouldShowDrift(instantRisk, sessionMinutes)

  function handleGroundedSelect(val) {
    setGroundedScore(val)
    setTimeout(() => {
      if (signals.length > 0) {
        setStep(STEPS.SIGNALS)
      } else if (showDrift) {
        setStep(STEPS.DRIFT)
      } else {
        finish(val, {})
      }
    }, 260)
  }

  function handleSignalAnswer(key, answer) {
    const next = { ...signalAnswers, [key]: answer }
    setSignalAnswers(next)

    const nextIdx = currentSignalIdx + 1
    setTimeout(() => {
      if (nextIdx < signals.length) {
        setCurrentSignalIdx(nextIdx)
      } else if (showDrift) {
        setStep(STEPS.DRIFT)
      } else {
        const yesCount = Object.values(next).filter(Boolean).length
        finish(groundedScore, next, yesCount)
      }
    }, 260)
  }

  function handleDriftComplete() {
    const yesCount = Object.values(signalAnswers).filter(Boolean).length
    finish(groundedScore, signalAnswers, yesCount, driftQ1, driftQ2)
  }

  function finish(gs, answers, yesCountOverride, dq1, dq2) {
    const yesCount = yesCountOverride ?? Object.values(answers).filter(Boolean).length
    onComplete({
      groundedScore: gs,
      yesCount,
      signalKeys: signals.map(s => s.key),
      signalAnswers: answers,
      driftQ1: dq1 ?? null,
      driftQ2: dq2 ?? null,
    })
  }

  const driftBothNo = driftQ1 === false && driftQ2 === false
  const driftEitherNo = driftQ1 === false || driftQ2 === false

  return (
    <div className="overlay">
      <div className="overlay-panel">
        {step === STEPS.GROUNDED && (
          <div className="fade-in">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
              check in
            </p>
            <h3 style={{ fontSize: 17, marginBottom: 24, fontWeight: 400, lineHeight: 1.4 }}>
              how grounded are you feeling right now?
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              1 = very ungrounded · 10 = very grounded
            </p>
            <div className="circle-row">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  className={`circle-btn ${groundedScore === n ? 'selected' : ''}`}
                  onClick={() => handleGroundedSelect(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === STEPS.SIGNALS && signals[currentSignalIdx] && (
          <div className="fade-in" key={currentSignalIdx}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
              {currentSignalIdx + 1} of {signals.length}
            </p>
            <h3 style={{ fontSize: 17, marginBottom: 32, fontWeight: 400, lineHeight: 1.5 }}>
              {signals[currentSignalIdx].question}
            </h3>
            <div className="yn-row">
              <button
                className={`yn-btn ${signalAnswers[signals[currentSignalIdx].key] === false ? 'selected' : ''}`}
                onClick={() => handleSignalAnswer(signals[currentSignalIdx].key, false)}
              >
                no
              </button>
              <button
                className={`yn-btn yes ${signalAnswers[signals[currentSignalIdx].key] === true ? 'selected' : ''}`}
                onClick={() => handleSignalAnswer(signals[currentSignalIdx].key, true)}
              >
                yes
              </button>
            </div>
          </div>
        )}

        {step === STEPS.DRIFT && (
          <div className="fade-in">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
              drift check
            </p>

            {driftQ1 === null && (
              <>
                <h3 style={{ fontSize: 17, marginBottom: 32, fontWeight: 400, lineHeight: 1.5 }}>
                  is this conversation still about what you opened it for?
                </h3>
                <div className="yn-row">
                  <button
                    className="yn-btn"
                    onClick={() => setDriftQ1(false)}
                  >no</button>
                  <button
                    className="yn-btn"
                    onClick={() => setDriftQ1(true)}
                  >yes</button>
                </div>
              </>
            )}

            {driftQ1 !== null && driftQ2 === null && (
              <>
                <h3 style={{ fontSize: 17, marginBottom: 32, fontWeight: 400, lineHeight: 1.5 }}>
                  could you close this tab easily right now?
                </h3>
                <div className="yn-row">
                  <button
                    className="yn-btn"
                    onClick={() => setDriftQ2(false)}
                  >no</button>
                  <button
                    className="yn-btn"
                    onClick={() => setDriftQ2(true)}
                  >yes</button>
                </div>
              </>
            )}

            {driftQ1 !== null && driftQ2 !== null && (
              <div className="fade-in">
                {driftBothNo && (
                  <div style={{
                    padding: '20px',
                    border: '1px solid #c0392b',
                    borderRadius: 4,
                    marginBottom: 20,
                  }}>
                    <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                      it might be a good time to step away. you can always come back.
                    </p>
                  </div>
                )}
                {!driftBothNo && driftEitherNo && (
                  <div style={{
                    padding: '20px',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    marginBottom: 20,
                  }}>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      consider taking a short break before continuing.
                    </p>
                  </div>
                )}
                <button
                  onClick={handleDriftComplete}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    fontSize: 14,
                    letterSpacing: '0.06em',
                    textTransform: 'lowercase',
                  }}
                >
                  continue session
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
