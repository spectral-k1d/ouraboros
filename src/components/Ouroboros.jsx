import { useRef, useEffect } from 'react'
import OuroborosRing from './OuroborosRing'

// Prop-driven wrapper around OuroborosRing.
// Accepts the same API as before: risk (0–10), size (px string or number), small, children.
function resolveSize(size, small) {
  if (small) return 48
  if (typeof size === 'number') return size
  if (typeof size === 'string') {
    if (size.endsWith('px')) return parseInt(size, 10)
    if (size.endsWith('vh')) return Math.round(window.innerHeight * parseFloat(size) / 100)
  }
  return 300
}

export default function Ouroboros({ risk = 1, size = '60vh', children, small = false }) {
  const ringRef = useRef(null)
  const px = resolveSize(size, small)

  // push risk changes into the ring imperatively — no re-render of OuroborosRing
  useEffect(() => {
    ringRef.current?.setScore(Math.min(10, Math.max(0, risk)))
  }, [risk])

  return (
    <div style={{
      position: 'relative',
      width: px,
      height: px,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <OuroborosRing ref={ringRef} size={px} />

      {children && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}
