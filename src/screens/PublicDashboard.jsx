import { useState, useEffect } from 'react'
import Ouroboros from '../components/Ouroboros'
import { supabase } from '../lib/supabase'
import { scoreToColor } from '../lib/danger'

const SIGNAL_KEYS = [
  'boundary_dissolution', 'reality_confirmation', 'loop_feeling', 'clarity_shift',
  'ideas_of_reference', 'grandiosity', 'paranoid_ideation', 'emotional_intensity',
]

const THEME_INFO = {
  boundary_dissolution: {
    label: 'boundary',
    description: 'loss of distinction between self and AI',
    questions: [
      { source: 'post-session', q: 'Did this conversation feel like it knew you?' },
      { source: 'check-in', q: 'Does this AI feel like it understands you unusually well right now?' },
    ],
  },
  reality_confirmation: {
    label: 'reality',
    description: 'AI validation of uncertain beliefs',
    questions: [
      { source: 'post-session', q: 'Did the AI validate something you were uncertain about?' },
      { source: 'check-in', q: 'Has the AI agreed with something that felt surprising to hear?' },
    ],
  },
  loop_feeling: {
    label: 'loop',
    description: 'compulsive continuation of the session',
    questions: [
      { source: 'post-session', q: 'Did you want to keep going?' },
      { source: 'check-in', q: 'Does this conversation feel hard to step away from?' },
    ],
  },
  clarity_shift: {
    label: 'clarity',
    description: 'change in cognitive clarity during session',
    questions: [
      { source: 'post-session', q: 'Do you feel clearer or less clear than when you started?' },
      { source: 'check-in', q: 'Is your thinking feeling less clear than when you started?' },
    ],
  },
  ideas_of_reference: {
    label: 'reference',
    description: 'feeling that AI responses are personally directed',
    questions: [
      { source: 'post-session', q: 'Did the responses feel like they were specifically about you?' },
      { source: 'check-in', q: 'Does this conversation feel like it\'s about you specifically?' },
    ],
  },
  grandiosity: {
    label: 'grandiosity',
    description: 'inflated sense of self from AI interaction',
    questions: [
      { source: 'post-session', q: 'Did the conversation go somewhere you didn\'t expect emotionally?' },
      { source: 'check-in', q: 'Has the AI made you feel particularly understood or special?' },
    ],
  },
  paranoid_ideation: {
    label: 'paranoid',
    description: 'sense of surveillance or hidden knowledge',
    questions: [
      { source: 'post-session', q: 'Did anything in the conversation feel like it knew too much?' },
      { source: 'check-in', q: 'Has anything in the AI\'s responses made you feel watched or judged?' },
    ],
  },
  emotional_intensity: {
    label: 'emotional',
    description: 'emotional charge beyond expected level',
    questions: [
      { source: 'post-session', q: 'Did the AI make you feel seen?' },
      { source: 'check-in', q: 'Is this conversation feeling more emotionally charged than you expected?' },
    ],
  },
}

const CLUSTER_POSITIONS = {
  boundary_dissolution: [22, 25],
  reality_confirmation: [52, 18],
  loop_feeling: [78, 28],
  clarity_shift: [15, 55],
  ideas_of_reference: [85, 55],
  grandiosity: [30, 78],
  paranoid_ideation: [60, 82],
  emotional_intensity: [72, 62],
}

const DANGER_BANDS = [
  { key: 'low',     label: 'low',     min: 0,   max: 3.5, midScore: 1.5 },
  { key: 'medium',  label: 'medium',  min: 3.5, max: 6.0, midScore: 4.5 },
  { key: 'high',    label: 'high',    min: 6.0, max: 8.0, midScore: 7.0 },
  { key: 'extreme', label: 'extreme', min: 8.0, max: 10,  midScore: 9.0 },
]

function clusterLogs(logs) {
  return logs.map(log => {
    const dominant = SIGNAL_KEYS.reduce((best, k) =>
      (log[k] ?? 0) > (log[best] ?? 0) ? k : best
    , SIGNAL_KEYS[0])
    const signalAvg = SIGNAL_KEYS.reduce((sum, k) => sum + (log[k] ?? 0), 0) / SIGNAL_KEYS.length
    const dangerScore = log.sessions?.danger_score ?? signalAvg
    return { ...log, dominant, dangerScore }
  })
}

export default function PublicDashboard({ onBack }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTheme, setActiveTheme] = useState(null)  // clicked theme popup
  const [activeTab, setActiveTab] = useState('themes')  // 'themes' | 'danger'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('post_session_logs')
      .select('*, sessions!inner(danger_score, platform, topic_category)')
      .limit(500)
    if (error) console.error('public dashboard fetch error:', error)
    setLogs(data ? clusterLogs(data) : [])
    setLoading(false)
  }

  const grouped = SIGNAL_KEYS.reduce((acc, k) => {
    acc[k] = logs.filter(l => l.dominant === k)
    return acc
  }, {})

  const bandedLogs = DANGER_BANDS.map(band => ({
    ...band,
    sessions: logs.filter(l => l.dangerScore >= band.min && l.dangerScore < band.max),
  }))

  const avgDanger = logs.length
    ? logs.reduce((s, l) => s + l.dangerScore, 0) / logs.length
    : 1

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ouroboros risk={1} size="120px" />
      </div>
    )
  }

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 48px' }}
      onClick={() => setActiveTheme(null)}
    >
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>aggregate view</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {logs.length} anonymized session{logs.length !== 1 ? 's' : ''} · consented contributors only
          </p>
        </div>
        <button onClick={onBack} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          ← back
        </button>
      </div>

      {/* tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
        {['themes', 'danger'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 16px',
              border: '1px solid var(--border)',
              borderRadius: 20,
              fontSize: 11,
              letterSpacing: '0.06em',
              background: activeTab === tab ? 'var(--text)' : 'transparent',
              color: activeTab === tab ? 'var(--bg)' : 'var(--text-muted)',
              transition: 'all 0.3s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {logs.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>no public data yet.</p>
        </div>
      ) : activeTab === 'themes' ? (
        // ── THEMES TAB ──────────────────────────────────────────────
        <div style={{ position: 'relative', flex: 1, minHeight: 500 }}>
          {/* faint bg ouroboros */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.06, pointerEvents: 'none' }}>
            <Ouroboros risk={avgDanger} size="80vh" />
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>
            click a theme to see which questions influence it
          </p>

          {SIGNAL_KEYS.map(k => {
            const [cx, cy] = CLUSTER_POSITIONS[k]
            const cluster = grouped[k] || []
            const clusterDanger = cluster.length
              ? cluster.reduce((s, l) => s + l.dangerScore, 0) / cluster.length
              : 0
            const color = scoreToColor(clusterDanger)
            const info = THEME_INFO[k]
            const isActive = activeTheme === k

            return (
              <div
                key={k}
                style={{ position: 'absolute', left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%, -50%)' }}
              >
                {/* dots */}
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  {cluster.slice(0, 30).map((l, i) => {
                    const angle = (i / Math.max(cluster.length, 1)) * 2 * Math.PI
                    const r = 8 + (i % 3) * 12 + Math.sin(i * 1.7) * 6
                    const x = 40 + r * Math.cos(angle)
                    const y = 40 + r * Math.sin(angle)
                    const dotColor = scoreToColor(l.dangerScore)
                    return (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: x, top: y,
                          width: 5 + (l.dangerScore / 10) * 4,
                          height: 5 + (l.dangerScore / 10) * 4,
                          borderRadius: '50%',
                          background: dotColor,
                          opacity: 0.5 + (l.dangerScore / 10) * 0.4,
                          filter: `blur(${(l.dangerScore / 10) * 1.5}px)`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    )
                  })}
                </div>

                {/* label — clickable */}
                <button
                  onClick={e => { e.stopPropagation(); setActiveTheme(isActive ? null : k) }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    fontSize: 11,
                    color: isActive ? color : 'var(--text-muted)',
                    letterSpacing: '0.06em',
                    marginTop: 4,
                    transition: 'color 0.3s',
                    opacity: 1,
                  }}
                >
                  {info.label}
                  {cluster.length > 0 && (
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      {cluster.length}
                    </span>
                  )}
                </button>

                {/* popup */}
                {isActive && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="fade-in"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: 10,
                      background: 'var(--surface)',
                      border: `1px solid ${color}`,
                      borderRadius: 6,
                      padding: '16px 18px',
                      minWidth: 240,
                      maxWidth: 300,
                      zIndex: 20,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                      {info.description}
                    </div>
                    {cluster.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                        avg danger: <span style={{ color }}>{(clusterDanger).toFixed(1)}</span>
                        {' · '}{cluster.length} session{cluster.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                      measured by
                    </div>
                    {info.questions.map((qItem, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: 9,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--text-muted)',
                          background: 'var(--surface2)',
                          borderRadius: 2,
                          padding: '1px 5px',
                          marginBottom: 3,
                        }}>
                          {qItem.source}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>
                          {qItem.q}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        // ── DANGER TAB ──────────────────────────────────────────────
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            sessions grouped by overall danger score
          </p>
          {bandedLogs.map(band => {
            const color = scoreToColor(band.midScore)
            const maxCount = Math.max(...bandedLogs.map(b => b.sessions.length), 1)
            return (
              <div key={band.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color, letterSpacing: '0.06em', width: 56, flexShrink: 0 }}>
                    {band.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 60, flexShrink: 0 }}>
                    {band.min}–{band.max}
                  </span>
                  {/* bar */}
                  <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(band.sessions.length / maxCount) * 100}%`,
                      background: color,
                      borderRadius: 3,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 32, textAlign: 'right', flexShrink: 0 }}>
                    {band.sessions.length}
                  </span>
                </div>
                {/* dot row */}
                {band.sessions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 128 }}>
                    {band.sessions.slice(0, 40).map((l, i) => (
                      <div
                        key={i}
                        title={`danger: ${l.dangerScore?.toFixed(1)} · ${THEME_INFO[l.dominant]?.label}`}
                        style={{
                          width: 8, height: 8,
                          borderRadius: '50%',
                          background: scoreToColor(l.dangerScore),
                          opacity: 0.7,
                        }}
                      />
                    ))}
                    {band.sessions.length > 40 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: '8px' }}>
                        +{band.sessions.length - 40}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
