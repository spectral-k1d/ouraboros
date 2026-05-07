import { useRef, useEffect, useImperativeHandle, forwardRef, memo } from 'react'
import { scoreToColor } from '../lib/danger'

const NUM_POINTS = 90

// pre-computed once — stable across all renders, never regenerated
const NOISE = Array.from({ length: NUM_POINTS }, () => ({
  amp: 0.04 + Math.random() * 0.06,
  freq: 0.8 + Math.random() * 1.5,
  phase: Math.random() * Math.PI * 2,
}))

function drawRing(ctx, size, t, score, canvasEl) {
  const cx = size / 2
  const cy = size / 2
  const baseR = size * 0.38
  const thickness = size * 0.10

  // 4 overlapping sine waves — irregular, alive
  const pulse =
    Math.sin(t * 1.2) * 0.38 +
    Math.sin(t * 2.6) * 0.27 +
    Math.sin(t * 0.75) * 0.22 +
    Math.sin(t * 4.1) * 0.13
  const maxAmp = 0.38 + 0.27 + 0.22 + 0.13
  const normPulse = pulse / maxAmp // -1 to 1

  // brightness flicker — independent of pulsation
  const flicker = 0.85 + 0.12 * Math.sin(t * 3.3) + 0.03 * Math.sin(t * 7.1)

  // edge blur increases with danger score × pulse intensity
  const blurAmount = score > 5 ? ((score - 5) / 5) * Math.abs(normPulse) * 10 : 0
  if (canvasEl) {
    canvasEl.style.filter = blurAmount > 0.3 ? `blur(${blurAmount.toFixed(1)}px)` : ''
  }

  ctx.clearRect(0, 0, size, size)
  ctx.globalAlpha = Math.max(0.7, Math.min(1, flicker))
  ctx.fillStyle = scoreToColor(score)

  // compound path: outer ring then inner ring (opposite winding = evenodd hole)
  ctx.beginPath()

  // outer — clockwise
  for (let i = 0; i <= NUM_POINTS; i++) {
    const angle = (i / NUM_POINTS) * Math.PI * 2 - Math.PI / 2
    const n = NOISE[i % NUM_POINTS]
    const localNoise = n.amp * Math.sin(t * n.freq + n.phase)
    const r = baseR * (1 + normPulse * 0.05 + localNoise + normPulse * n.amp * 0.5)
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()

  // inner — counter-clockwise (creates the hole)
  const innerR = baseR - thickness
  for (let i = NUM_POINTS; i >= 0; i--) {
    const angle = (i / NUM_POINTS) * Math.PI * 2 - Math.PI / 2
    const n = NOISE[i % NUM_POINTS]
    const localNoise = n.amp * 0.6 * Math.sin(t * n.freq * 1.1 + n.phase + 1.2)
    const r = innerR * (1 + normPulse * 0.03 + localNoise * 0.5)
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    i === NUM_POINTS ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()

  ctx.fill('evenodd')
  ctx.globalAlpha = 1
}

const OuroborosRing = memo(forwardRef(function OuroborosRing({ size = 500 }, ref) {
  const canvasRef = useRef(null)
  const scoreRef = useRef(0)
  const frameRef = useRef(null)

  useImperativeHandle(ref, () => ({
    setScore(n) {
      scoreRef.current = Math.max(0, Math.min(10, n))
    },
  }), [])

  // animation starts once on mount — never restarts
  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const startTime = performance.now()
    function loop(now) {
      drawRing(ctx, size, (now - startTime) / 1000, scoreRef.current, canvas)
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block' }}
    />
  )
}))

export default OuroborosRing
