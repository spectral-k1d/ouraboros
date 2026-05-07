import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'
import Ouroboros from '../components/Ouroboros'

const SIGNAL_LABELS = {
  boundary_dissolution: 'boundary',
  reality_confirmation: 'reality',
  loop_feeling: 'loop',
  clarity_shift: 'clarity',
  ideas_of_reference: 'reference',
  grandiosity: 'grandiosity',
  paranoid_ideation: 'paranoid',
  emotional_intensity: 'emotional',
}

export default function SessionSummary({ ratings, lastRisk, onDone, onCorrect }) {
  const [corrections, setCorrections] = useState({})
  const [correcting, setCorrecting] = useState(null)
  const [tempVal, setTempVal] = useState(null)
  const [tempNote, setTempNote] = useState('')

  const data = Object.entries(ratings).map(([key, val]) => ({
    subject: SIGNAL_LABELS[key] || key,
    value: corrections[key]?.corrected ?? val,
    fullMark: 10,
  }))

  function startCorrect(key) {
    setCorrecting(key)
    setTempVal(corrections[key]?.corrected ?? ratings[key])
    setTempNote('')
  }

  function saveCorrection(key) {
    setCorrections(c => ({
      ...c,
      [key]: { original: ratings[key], corrected: tempVal, note: tempNote },
    }))
    onCorrect && onCorrect({ key, original: ratings[key], corrected: tempVal, note: tempNote })
    setCorrecting(null)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '48px 40px',
      maxWidth: 600,
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
        <Ouroboros risk={lastRisk} small />
      </div>

      <h2 style={{ marginBottom: 6, fontSize: 18 }}>session summary</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
        your signal profile for this session.
      </p>

      {/* radar chart */}
      <div style={{ width: '100%', height: 280, marginBottom: 36 }} className="fade-in">
        <ResponsiveContainer>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid
              stroke="var(--border)"
              strokeDasharray="2 4"
            />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'DM Sans' }}
            />
            <Radar
              name="signals"
              dataKey="value"
              stroke="var(--text)"
              fill="var(--text)"
              fillOpacity={0.08}
              strokeWidth={1.5}
              strokeDasharray="0"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* entries with correction option */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(ratings).map(([key, val]) => {
          const corrected = corrections[key]?.corrected
          const label = SIGNAL_LABELS[key] || key
          return (
            <div key={key}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13 }}>
                    {corrected !== undefined ? (
                      <>
                        <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', marginRight: 6 }}>{val}</span>
                        <span>{corrected}</span>
                      </>
                    ) : val}
                  </span>
                  <button
                    onClick={() => startCorrect(key)}
                    style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'underline' }}
                  >
                    correct
                  </button>
                </div>
              </div>

              {correcting === key && (
                <div className="fade-in" style={{
                  padding: '16px',
                  background: 'var(--surface2)',
                  borderRadius: 4,
                  marginTop: 4,
                  marginBottom: 4,
                }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    correct your rating
                  </p>
                  <div className="circle-row" style={{ marginBottom: 12 }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button
                        key={n}
                        className={`circle-btn ${tempVal === n ? 'selected' : ''}`}
                        onClick={() => setTempVal(n)}
                        style={{ width: 36, height: 36, fontSize: 12 }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tempNote}
                    onChange={e => setTempNote(e.target.value)}
                    placeholder="optional note"
                    style={{ marginBottom: 12 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => saveCorrection(key)}
                      style={{
                        flex: 1, padding: '8px',
                        border: '1px solid var(--border)', borderRadius: 3, fontSize: 13,
                      }}
                    >
                      save
                    </button>
                    <button
                      onClick={() => setCorrecting(null)}
                      style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)' }}
                    >
                      cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={onDone}
        style={{
          marginTop: 32,
          padding: '12px',
          border: '1px solid var(--border)',
          borderRadius: 4,
          fontSize: 14,
          letterSpacing: '0.08em',
        }}
      >
        go to dashboard
      </button>
    </div>
  )
}
