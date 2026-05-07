import { useState, useEffect, useRef, useCallback } from 'react'
import OuroborosRing from '../components/OuroborosRing'
import { calcDanger, scoreToColor } from '../lib/danger'

const RADAR_AXES = [
  { key: 'boundary_dissolution', label: 'boundary' },
  { key: 'reality_confirmation', label: 'reality' },
  { key: 'loop_feeling',         label: 'loop' },
  { key: 'clarity_shift',        label: 'clarity' },
  { key: 'ideas_of_reference',   label: 'reference' },
  { key: 'grandiosity',          label: 'grandiosity' },
  { key: 'paranoid_ideation',    label: 'paranoid' },
  { key: 'emotional_intensity',  label: 'emotional' },
]

const RADAR_SIZE = 360
const N = RADAR_AXES.length

function axisAngle(i) {
  return (i / N) * Math.PI * 2 - Math.PI / 2
}

function drawRadar(ctx, scores, dangerScore) {
  const W = RADAR_SIZE
  const H = RADAR_SIZE
  const cx = W / 2
  const cy = H / 2
  const maxR = W * 0.33
  const labelR = maxR + 26
  const color = scoreToColor(dangerScore)

  ctx.clearRect(0, 0, W, H)

  // grid rings
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  for (const pct of [0.33, 0.66, 1]) {
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const a = axisAngle(i % N)
      const r = maxR * pct
      i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
              : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.stroke()
  }

  // axes
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  for (let i = 0; i < N; i++) {
    const a = axisAngle(i)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR)
    ctx.stroke()
  }

  // data polygon fill
  const parseRgb = (s) => s.match(/\d+/g).map(Number)
  const [r, g, b] = parseRgb(color)
  ctx.fillStyle = `rgba(${r},${g},${b},0.18)`
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const idx = i % N
    const a = axisAngle(idx)
    const val = scores[RADAR_AXES[idx].key] || 0
    const rad = (val / 10) * maxR
    i === 0 ? ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
            : ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
  }
  ctx.closePath()
  ctx.fill()

  // polygon stroke
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const idx = i % N
    const a = axisAngle(idx)
    const val = scores[RADAR_AXES[idx].key] || 0
    const rad = (val / 10) * maxR
    i === 0 ? ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
            : ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
  }
  ctx.closePath()
  ctx.stroke()

  // labels — slightly brighter when hoverable
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < N; i++) {
    const a = axisAngle(i)
    const lx = cx + Math.cos(a) * labelR
    const ly = cy + Math.sin(a) * labelR
    ctx.font = '11px DM Sans, sans-serif'
    ctx.fillStyle = 'rgba(200,200,195,0.85)'
    ctx.fillText(RADAR_AXES[i].label, lx, ly)
  }
}

export default function SessionSummary({ ratings, dangerScore: initialDanger, onDone, onCorrect }) {
  const ouroborosRef = useRef(null)
  const canvasRef = useRef(null)

  // only use the 8 DB signal keys in the radar
  const initial8 = Object.fromEntries(
    RADAR_AXES.map(a => [a.key, ratings[a.key] ?? 1])
  )
  const [scores, setScores] = useState(initial8)
  const [dangerScore, setDangerScore] = useState(initialDanger ?? calcDanger(ratings))

  // set ouroboros to session danger on mount
  useEffect(() => {
    ouroborosRef.current?.setScore(dangerScore)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // redraw radar whenever scores or danger change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== RADAR_SIZE * dpr) {
      canvas.width = RADAR_SIZE * dpr
      canvas.height = RADAR_SIZE * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
    }
    const ctx = canvas.getContext('2d')
    drawRadar(ctx, scores, dangerScore)
  }, [scores, dangerScore])

  // clicking a label reduces that signal by 1
  function handleCanvasClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = RADAR_SIZE / 2
    const cy = RADAR_SIZE / 2
    const labelR = RADAR_SIZE * 0.33 + 26

    for (let i = 0; i < N; i++) {
      const a = axisAngle(i)
      const lx = cx + Math.cos(a) * labelR
      const ly = cy + Math.sin(a) * labelR
      if (Math.hypot(x - lx, y - ly) < 32) {
        setScores(prev => {
          const next = { ...prev, [RADAR_AXES[i].key]: Math.max(1, (prev[RADAR_AXES[i].key] || 1) - 1) }
          const newDanger = calcDanger(next)
          setDangerScore(newDanger)
          ouroborosRef.current?.setScore(newDanger)
          return next
        })
        break
      }
    }
  }

  const ringSize = Math.min(window.innerWidth, window.innerHeight) * 0.85
  const color = scoreToColor(dangerScore)

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* large ouroboros fixed behind */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.6,
      }}>
        <OuroborosRing ref={ouroborosRef} size={ringSize} />
      </div>

      {/* content layer */}
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
        <h2 style={{ marginBottom: 6, fontSize: 18 }}>session summary</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
          your signal profile for this session.
        </p>

        {/* radar chart */}
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ width: RADAR_SIZE, height: RADAR_SIZE, cursor: 'pointer', display: 'block' }}
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.04em' }}>
            click a label to reduce that signal · watch the pattern shift
          </p>
          <div style={{ marginTop: 12, fontSize: 22, fontWeight: 300, color, transition: 'color 0.5s' }}>
            {dangerScore.toFixed(1)}
          </div>
        </div>

        {/* signal list with values */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 32, marginTop: 16 }}>
          {RADAR_AXES.map(axis => {
            const orig = ratings[axis.key] ?? 1
            const cur = scores[axis.key]
            const changed = cur !== orig
            return (
              <div key={axis.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{axis.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {changed && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{orig}</span>
                  )}
                  <span style={{ fontSize: 13, color: changed ? color : 'var(--text)' }}>{cur}</span>
                  {onCorrect && !changed && (
                    <button
                      onClick={() => {
                        onCorrect({ key: axis.key, original: orig, corrected: Math.max(1, orig - 1), note: '' })
                        setScores(prev => {
                          const next = { ...prev, [axis.key]: Math.max(1, (prev[axis.key] || 1) - 1) }
                          const newDanger = calcDanger(next)
                          setDangerScore(newDanger)
                          ouroborosRef.current?.setScore(newDanger)
                          return next
                        })
                      }}
                      style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'underline' }}
                    >
                      correct
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={onDone}
          style={{
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
    </div>
  )
}
