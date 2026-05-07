import { useState, useEffect, useMemo } from 'react'
import Ouroboros from '../components/Ouroboros'
import { supabase } from '../lib/supabase'
import { scoreToColor } from '../lib/danger'

const SIGNAL_KEYS = [
  'boundary_dissolution', 'reality_confirmation', 'loop_feeling', 'clarity_shift',
  'ideas_of_reference', 'grandiosity', 'paranoid_ideation', 'emotional_intensity',
]

// ── Theme metadata ────────────────────────────────────────────────────────────

const THEME_INFO = {
  boundary_dissolution: {
    label: 'boundary',
    description: 'loss of distinction between self and AI',
    questions: [
      { source: 'post-session', q: 'Did this conversation feel like it knew you?' },
      { source: 'check-in',    q: 'Does this AI feel like it understands you unusually well right now?' },
    ],
  },
  reality_confirmation: {
    label: 'reality',
    description: 'AI validation of uncertain beliefs',
    questions: [
      { source: 'post-session', q: 'Did the AI validate something you were uncertain about?' },
      { source: 'check-in',    q: 'Has the AI agreed with something that felt surprising to hear?' },
    ],
  },
  loop_feeling: {
    label: 'loop',
    description: 'compulsive continuation of the session',
    questions: [
      { source: 'post-session', q: 'Did you want to keep going?' },
      { source: 'check-in',    q: 'Does this conversation feel hard to step away from?' },
    ],
  },
  clarity_shift: {
    label: 'clarity',
    description: 'change in cognitive clarity during session',
    questions: [
      { source: 'post-session', q: 'Do you feel clearer or less clear than when you started?' },
      { source: 'check-in',    q: 'Is your thinking feeling less clear than when you started?' },
    ],
  },
  ideas_of_reference: {
    label: 'reference',
    description: 'feeling that AI responses are personally directed',
    questions: [
      { source: 'post-session', q: 'Did the responses feel like they were specifically about you?' },
      { source: 'check-in',    q: "Does this conversation feel like it's about you specifically?" },
    ],
  },
  grandiosity: {
    label: 'grandiosity',
    description: 'inflated sense of self from AI interaction',
    questions: [
      { source: 'post-session', q: "Did the conversation go somewhere you didn't expect emotionally?" },
      { source: 'check-in',    q: 'Has the AI made you feel particularly understood or special?' },
    ],
  },
  paranoid_ideation: {
    label: 'paranoid',
    description: 'sense of surveillance or hidden knowledge',
    questions: [
      { source: 'post-session', q: 'Did anything in the conversation feel like it knew too much?' },
      { source: 'check-in',    q: "Has anything in the AI's responses made you feel watched or judged?" },
    ],
  },
  emotional_intensity: {
    label: 'emotional',
    description: 'emotional charge beyond expected level',
    questions: [
      { source: 'post-session', q: 'Did the AI make you feel seen?' },
      { source: 'check-in',    q: 'Is this conversation feeling more emotionally charged than you expected?' },
    ],
  },
}

const THEME_POSITIONS = {
  boundary_dissolution: [22, 25],
  reality_confirmation: [52, 18],
  loop_feeling:         [78, 28],
  clarity_shift:        [15, 55],
  ideas_of_reference:   [85, 55],
  grandiosity:          [30, 78],
  paranoid_ideation:    [60, 82],
  emotional_intensity:  [72, 62],
}

// ── Danger band metadata ──────────────────────────────────────────────────────

const DANGER_BANDS = [
  { key: 'low',     label: 'low',     min: 0,   max: 3.5, midScore: 1.5, pos: [22, 24] },
  { key: 'medium',  label: 'medium',  min: 3.5, max: 6.0, midScore: 4.5, pos: [72, 22] },
  { key: 'high',    label: 'high',    min: 6.0, max: 8.0, midScore: 7.0, pos: [20, 70] },
  { key: 'extreme', label: 'extreme', min: 8.0, max: 10,  midScore: 9.0, pos: [74, 72] },
]

// ── Model colours ─────────────────────────────────────────────────────────────

const KNOWN_MODEL_COLORS = {
  claude:      '#c9a84c',
  chatgpt:     '#4db8a0',
  gemini:      '#7b6dd6',
  copilot:     '#4a9edd',
  grok:        '#e87840',
  perplexity:  '#40c0c8',
  mistral:     '#d46895',
  llama:       '#8ab840',
}

const COLOR_PALETTE = [
  '#c9a84c', '#4db8a0', '#7b6dd6', '#4a9edd',
  '#e87840', '#40c0c8', '#d46895', '#8ab840',
  '#e8c060', '#60b8d8', '#a070d0', '#60d0a0',
]

function getModelColor(platform, modelIndex) {
  const lower = (platform || '').toLowerCase()
  for (const [key, color] of Object.entries(KNOWN_MODEL_COLORS)) {
    if (lower.includes(key)) return color
  }
  return COLOR_PALETTE[modelIndex % COLOR_PALETTE.length]
}

// positions for up to 10 model clusters arranged in a circle
function computeModelPositions(models) {
  const n = models.length
  return models.reduce((acc, m, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    acc[m] = [
      50 + 34 * Math.cos(angle),
      46 + 30 * Math.sin(angle),
    ]
    return acc
  }, {})
}

// ── Data helpers ──────────────────────────────────────────────────────────────

function clusterLogs(logs) {
  return logs.map(log => {
    const dominant = SIGNAL_KEYS.reduce((best, k) =>
      (log[k] ?? 0) > (log[best] ?? 0) ? k : best
    , SIGNAL_KEYS[0])
    const signalAvg = SIGNAL_KEYS.reduce((sum, k) => sum + (log[k] ?? 0), 0) / SIGNAL_KEYS.length
    const dangerScore = log.sessions?.danger_score ?? signalAvg
    const platform = log.sessions?.platform || 'unknown'
    return { ...log, dominant, dangerScore, platform }
  })
}

// ── Bubble component ──────────────────────────────────────────────────────────

function GlowBubble({ danger, color, title }) {
  const size = 5 + (danger / 10) * 8
  const glowSize = 4 + (danger / 10) * 14
  return (
    <div
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        opacity: 0.55 + (danger / 10) * 0.35,
        boxShadow: `0 0 ${glowSize}px ${color}`,
        flexShrink: 0,
        transform: 'translate(-50%, -50%)',
        position: 'absolute',
      }}
    />
  )
}

// ── Cluster scatter canvas ────────────────────────────────────────────────────

function BubbleCluster({ cx, cy, items, activePopup, onClickLabel, label, sublabel, labelColor, children }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${cx}%`,
        top: `${cy}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* scatter field */}
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        {items.slice(0, 40).map((item, i) => {
          const angle = (i / Math.max(items.length, 1)) * 2 * Math.PI
          const r = 10 + (i % 4) * 11 + Math.sin(i * 1.9) * 7
          const x = 50 + r * Math.cos(angle)
          const y = 50 + r * Math.sin(angle)
          return (
            <GlowBubble
              key={i}
              danger={item.danger}
              color={item.color}
              title={item.title}
              style={{ left: x, top: y }}
            />
          )
        })}
      </div>

      {/* label */}
      <button
        onClick={e => { e.stopPropagation(); onClickLabel() }}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          fontSize: 11,
          color: activePopup ? labelColor : 'var(--text-muted)',
          letterSpacing: '0.06em',
          marginTop: 4,
          transition: 'color 0.3s',
          opacity: 1,
        }}
      >
        {label}
        {sublabel && (
          <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
            {sublabel}
          </span>
        )}
      </button>

      {/* popup slot */}
      {activePopup && children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PublicDashboard({ onBack }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('themes')         // 'themes' | 'danger' | 'models'
  const [activeTheme, setActiveTheme] = useState(null)
  const [activeDanger, setActiveDanger] = useState(null)
  const [activeModel, setActiveModel] = useState(null)
  const [dangerFilter, setDangerFilter] = useState(null)       // model filter in danger view
  const [modelFilter, setModelFilter] = useState(null)         // danger band filter in model view

  useEffect(() => { loadData() }, [])

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

  // unique sorted models
  const allModels = useMemo(() => {
    const set = new Set(logs.map(l => l.platform))
    return [...set].sort()
  }, [logs])

  const modelColorMap = useMemo(() => (
    allModels.reduce((acc, m, i) => {
      acc[m] = getModelColor(m, i)
      return acc
    }, {})
  ), [allModels])

  const modelPositions = useMemo(() => computeModelPositions(allModels), [allModels])

  // grouped data
  const themeGrouped = useMemo(() => SIGNAL_KEYS.reduce((acc, k) => {
    acc[k] = logs.filter(l => l.dominant === k)
    return acc
  }, {}), [logs])

  const dangerGrouped = useMemo(() => DANGER_BANDS.map(band => ({
    ...band,
    sessions: logs.filter(l =>
      l.dangerScore >= band.min && l.dangerScore < band.max &&
      (!dangerFilter || l.platform === dangerFilter)
    ),
  })), [logs, dangerFilter])

  const modelGrouped = useMemo(() => allModels.reduce((acc, m) => {
    acc[m] = logs.filter(l =>
      l.platform === m &&
      (!modelFilter ? true : (() => {
        const band = DANGER_BANDS.find(b => l.dangerScore >= b.min && l.dangerScore < b.max)
        return band?.key === modelFilter
      })())
    )
    return acc
  }, {}), [logs, allModels, modelFilter])

  const avgDanger = logs.length
    ? logs.reduce((s, l) => s + l.dangerScore, 0) / logs.length
    : 1

  const dismissAll = () => { setActiveTheme(null); setActiveDanger(null); setActiveModel(null) }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ouroboros risk={1} size="120px" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 48px' }} onClick={dismissAll}>

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>aggregate view</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {logs.length} anonymized session{logs.length !== 1 ? 's' : ''} · consented contributors only
          </p>
        </div>
        <button onClick={onBack} style={{ fontSize: 12, color: 'var(--text-muted)' }}>← back</button>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {['themes', 'danger', 'models'].map(tab => (
          <button
            key={tab}
            onClick={e => { e.stopPropagation(); setActiveTab(tab); dismissAll() }}
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
        // ── THEMES ───────────────────────────────────────────────────────────
        <div style={{ position: 'relative', flex: 1, minHeight: 500 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.06, pointerEvents: 'none' }}>
            <Ouroboros risk={avgDanger} size="80vh" />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>
            click a theme to see which questions influence it
          </p>

          {SIGNAL_KEYS.map(k => {
            const [cx, cy] = THEME_POSITIONS[k]
            const cluster = themeGrouped[k] || []
            const clusterDanger = cluster.length
              ? cluster.reduce((s, l) => s + l.dangerScore, 0) / cluster.length : 0
            const color = scoreToColor(clusterDanger)
            const info = THEME_INFO[k]
            const isActive = activeTheme === k

            const items = cluster.map(l => ({
              danger: l.dangerScore,
              color: scoreToColor(l.dangerScore),
              title: `danger: ${l.dangerScore?.toFixed(1)}`,
            }))

            return (
              <BubbleCluster
                key={k}
                cx={cx} cy={cy}
                items={items}
                activePopup={isActive}
                onClickLabel={() => setActiveTheme(isActive ? null : k)}
                label={info.label}
                sublabel={cluster.length > 0 ? String(cluster.length) : null}
                labelColor={color}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  className="fade-in"
                  style={{
                    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                    marginTop: 10, background: 'var(--surface)', border: `1px solid ${color}`,
                    borderRadius: 6, padding: '16px 18px', minWidth: 240, maxWidth: 300, zIndex: 20,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color }}>{info.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>{info.description}</div>
                  {cluster.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                      avg danger: <span style={{ color }}>{clusterDanger.toFixed(1)}</span>
                      {' · '}{cluster.length} session{cluster.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>measured by</div>
                  {info.questions.map((qItem, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <span style={{ display: 'inline-block', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 2, padding: '1px 5px', marginBottom: 3 }}>
                        {qItem.source}
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>{qItem.q}</div>
                    </div>
                  ))}
                </div>
              </BubbleCluster>
            )
          })}
        </div>

      ) : activeTab === 'danger' ? (
        // ── DANGER ───────────────────────────────────────────────────────────
        <div style={{ flex: 1, minHeight: 500 }}>
          {/* model filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 4 }}>filter by model:</span>
            {allModels.map(m => {
              const mc = modelColorMap[m]
              const active = dangerFilter === m
              return (
                <button
                  key={m}
                  onClick={() => setDangerFilter(active ? null : m)}
                  style={{
                    padding: '4px 12px',
                    border: `1px solid ${active ? mc : 'var(--border)'}`,
                    borderRadius: 20,
                    fontSize: 11,
                    background: active ? mc : 'transparent',
                    color: active ? 'var(--bg)' : mc,
                    transition: 'all 0.2s',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m}
                </button>
              )
            })}
          </div>

          <div style={{ position: 'relative', minHeight: 460 }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.05, pointerEvents: 'none' }}>
              <Ouroboros risk={avgDanger} size="70vh" />
            </div>

            {dangerGrouped.map(band => {
              const bandColor = scoreToColor(band.midScore)
              const isActive = activeDanger === band.key
              const [cx, cy] = band.pos

              const items = band.sessions.map(l => ({
                danger: l.dangerScore,
                color: modelColorMap[l.platform] || 'var(--text-muted)',
                title: `${l.platform} · danger: ${l.dangerScore?.toFixed(1)}`,
              }))

              const avgBandDanger = band.sessions.length
                ? band.sessions.reduce((s, l) => s + l.dangerScore, 0) / band.sessions.length : 0

              // count per model in this band
              const modelBreakdown = allModels
                .map(m => ({ model: m, count: band.sessions.filter(l => l.platform === m).length, color: modelColorMap[m] }))
                .filter(x => x.count > 0)

              return (
                <BubbleCluster
                  key={band.key}
                  cx={cx} cy={cy}
                  items={items}
                  activePopup={isActive}
                  onClickLabel={() => setActiveDanger(isActive ? null : band.key)}
                  label={band.label}
                  sublabel={band.sessions.length > 0 ? `${band.min}–${band.max}  ·  ${band.sessions.length}` : `${band.min}–${band.max}`}
                  labelColor={bandColor}
                >
                  <div
                    onClick={e => e.stopPropagation()}
                    className="fade-in"
                    style={{
                      position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                      marginTop: 10, background: 'var(--surface)', border: `1px solid ${bandColor}`,
                      borderRadius: 6, padding: '16px 18px', minWidth: 200, zIndex: 20,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: bandColor }}>
                      {band.label} · {band.min}–{band.max}
                    </div>
                    {band.sessions.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                        avg danger: <span style={{ color: bandColor }}>{avgBandDanger.toFixed(1)}</span>
                        {' · '}{band.sessions.length} session{band.sessions.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    {modelBreakdown.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>by model</div>
                        {modelBreakdown.map(({ model, count, color }) => (
                          <div key={model} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                            <span style={{ fontSize: 11, color: 'var(--text)', flex: 1 }}>{model}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{count}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </BubbleCluster>
              )
            })}
          </div>
        </div>

      ) : (
        // ── MODELS ───────────────────────────────────────────────────────────
        <div style={{ flex: 1, minHeight: 500 }}>
          {/* danger band filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 4 }}>filter by danger:</span>
            {DANGER_BANDS.map(band => {
              const bc = scoreToColor(band.midScore)
              const active = modelFilter === band.key
              return (
                <button
                  key={band.key}
                  onClick={() => setModelFilter(active ? null : band.key)}
                  style={{
                    padding: '4px 12px',
                    border: `1px solid ${active ? bc : 'var(--border)'}`,
                    borderRadius: 20,
                    fontSize: 11,
                    background: active ? bc : 'transparent',
                    color: active ? 'var(--bg)' : bc,
                    transition: 'all 0.2s',
                    letterSpacing: '0.04em',
                  }}
                >
                  {band.label}
                </button>
              )
            })}
          </div>

          <div style={{ position: 'relative', minHeight: 460 }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.05, pointerEvents: 'none' }}>
              <Ouroboros risk={avgDanger} size="70vh" />
            </div>

            {allModels.map(m => {
              const [cx, cy] = modelPositions[m] || [50, 50]
              const mc = modelColorMap[m]
              const cluster = modelGrouped[m] || []
              const isActive = activeModel === m

              const avgModelDanger = cluster.length
                ? cluster.reduce((s, l) => s + l.dangerScore, 0) / cluster.length : 0

              const items = cluster.map(l => ({
                danger: l.dangerScore,
                color: scoreToColor(l.dangerScore),
                title: `danger: ${l.dangerScore?.toFixed(1)}`,
              }))

              // danger breakdown for this model
              const bandBreakdown = DANGER_BANDS
                .map(band => ({
                  ...band,
                  count: cluster.filter(l => l.dangerScore >= band.min && l.dangerScore < band.max).length,
                  color: scoreToColor(band.midScore),
                }))
                .filter(x => x.count > 0)

              return (
                <BubbleCluster
                  key={m}
                  cx={cx} cy={cy}
                  items={items}
                  activePopup={isActive}
                  onClickLabel={() => setActiveModel(isActive ? null : m)}
                  label={m}
                  sublabel={cluster.length > 0 ? `${cluster.length} · avg ${avgModelDanger.toFixed(1)}` : '0'}
                  labelColor={mc}
                >
                  <div
                    onClick={e => e.stopPropagation()}
                    className="fade-in"
                    style={{
                      position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                      marginTop: 10, background: 'var(--surface)', border: `1px solid ${mc}`,
                      borderRadius: 6, padding: '16px 18px', minWidth: 200, zIndex: 20,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: mc }}>{m}</div>
                    {cluster.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                        avg danger: <span style={{ color: mc }}>{avgModelDanger.toFixed(1)}</span>
                        {' · '}{cluster.length} session{cluster.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    {bandBreakdown.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>danger distribution</div>
                        {bandBreakdown.map(({ key, label, count, color }) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                            <span style={{ fontSize: 11, color: 'var(--text)', flex: 1 }}>{label}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{count}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </BubbleCluster>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
