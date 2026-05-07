import { useEffect, useRef, useMemo } from 'react'

function getRiskStyle(risk) {
  if (risk < 4) {
    return {
      color: '#f0ede8',
      glowColor: 'rgba(240,237,232,0.06)',
      pulseMin: 0.97,
      pulseMax: 1.03,
      pulseDuration: 4000,
      irregular: false,
      label: null,
    }
  }
  if (risk < 6) {
    const t = (risk - 4) / 2
    return {
      color: `rgb(${Math.round(240)}, ${Math.round(237 - t * 60)}, ${Math.round(232 - t * 80)})`,
      glowColor: `rgba(240,180,170,${0.06 + t * 0.08})`,
      pulseMin: 0.96,
      pulseMax: 1.04,
      pulseDuration: 3000,
      irregular: false,
      label: null,
    }
  }
  if (risk < 7.5) {
    const t = (risk - 6) / 1.5
    return {
      color: `rgb(${Math.round(230 - t * 10)}, ${Math.round(120 - t * 70)}, ${Math.round(100 - t * 70)})`,
      glowColor: `rgba(220,80,60,${0.12 + t * 0.12})`,
      pulseMin: 0.94,
      pulseMax: 1.06,
      pulseDuration: 2200,
      irregular: false,
      label: null,
    }
  }
  if (risk < 9) {
    const t = (risk - 7.5) / 1.5
    return {
      color: `rgb(${Math.round(210 + t * 45)}, ${Math.round(30 - t * 20)}, ${Math.round(20 - t * 15)})`,
      glowColor: `rgba(220,30,20,${0.22 + t * 0.18})`,
      pulseMin: 0.91,
      pulseMax: 1.09,
      pulseDuration: 1600,
      irregular: true,
      label: 'check in',
    }
  }
  return {
    color: '#ff1a0a',
    glowColor: 'rgba(255,26,10,0.45)',
    pulseMin: 0.88,
    pulseMax: 1.12,
    pulseDuration: 1100,
    irregular: true,
    label: 'check in',
  }
}

export default function Ouroboros({ risk = 1, size = '60vh', children, small = false }) {
  const style = useMemo(() => getRiskStyle(risk), [risk])
  const ringRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    let start = null
    const animate = (ts) => {
      if (!start) start = ts
      const elapsed = ts - start
      const duration = style.pulseDuration

      let phase = (elapsed % duration) / duration
      if (style.irregular) {
        const noise = Math.sin(elapsed * 0.003) * 0.15 + Math.sin(elapsed * 0.0071) * 0.08
        phase = ((phase + noise) % 1 + 1) % 1
      }

      const t = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
      const scale = style.pulseMin + (style.pulseMax - style.pulseMin) * t

      if (ringRef.current) {
        ringRef.current.style.transform = `scale(${scale})`
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [style])

  const svgSize = small ? '48px' : size

  return (
    <div style={{
      position: 'relative',
      width: svgSize,
      height: svgSize,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {/* glow halo */}
      <div style={{
        position: 'absolute',
        inset: '-12%',
        borderRadius: '50%',
        background: `radial-gradient(ellipse, ${style.glowColor} 30%, transparent 70%)`,
        transition: 'background 1.5s ease',
        pointerEvents: 'none',
      }} />

      {/* ouroboros ring — CSS mask for direct color control */}
      <div
        ref={ringRef}
        style={{
          width: '100%',
          height: '100%',
          WebkitMaskImage: 'url(/ouroboros.svg)',
          maskImage: 'url(/ouroboros.svg)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          backgroundColor: style.color,
          transformOrigin: 'center center',
          transition: 'background-color 1.5s ease',
        }}
      />

      {/* center content */}
      <div style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        zIndex: 10,
      }}>
        {children}
        {style.label && !small && (
          <div style={{
            fontSize: '11px',
            letterSpacing: '0.15em',
            color: style.color,
            textTransform: 'lowercase',
            marginTop: 8,
            animation: 'pulse-label 1.5s ease-in-out infinite',
          }}>
            {style.label}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-label {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
