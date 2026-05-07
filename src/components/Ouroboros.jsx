import { useEffect, useRef, useMemo } from 'react'

function getRiskStyle(risk) {
  if (risk < 4) {
    return {
      // off-white — no hue shift, just brightness
      cssFilter: 'brightness(0.95) saturate(0.1)',
      glowColor: 'rgba(240,237,232,0.07)',
      pulseMin: 0.97,
      pulseMax: 1.03,
      pulseDuration: 4000,
      irregular: false,
      blurPx: 0,
      label: null,
    }
  }
  if (risk < 6) {
    const t = (risk - 4) / 2
    return {
      cssFilter: `brightness(1) saturate(${0.3 + t * 0.5}) sepia(${t * 0.4})`,
      glowColor: `rgba(232,192,184,${0.05 + t * 0.08})`,
      pulseMin: 0.96,
      pulseMax: 1.04,
      pulseDuration: 3000,
      irregular: false,
      blurPx: t * 1.5,
      label: null,
    }
  }
  if (risk < 7.5) {
    const t = (risk - 6) / 1.5
    return {
      cssFilter: `brightness(1.1) saturate(${0.8 + t * 0.6}) sepia(${0.4 + t * 0.3}) hue-rotate(${-10 - t * 15}deg)`,
      glowColor: `rgba(212,101,74,${0.12 + t * 0.12})`,
      pulseMin: 0.94,
      pulseMax: 1.06,
      pulseDuration: 2200,
      irregular: false,
      blurPx: 1.5 + t * 2.5,
      label: null,
    }
  }
  if (risk < 9) {
    const t = (risk - 7.5) / 1.5
    return {
      cssFilter: `brightness(1.2) saturate(2.5) sepia(0.9) hue-rotate(${-30 - t * 20}deg)`,
      glowColor: `rgba(220,40,30,${0.2 + t * 0.2})`,
      pulseMin: 0.91,
      pulseMax: 1.09,
      pulseDuration: 1600,
      irregular: true,
      blurPx: 3 + t * 4,
      label: 'check in',
    }
  }
  return {
    cssFilter: 'brightness(1.4) saturate(3) sepia(1) hue-rotate(-55deg)',
    glowColor: 'rgba(255,26,10,0.45)',
    pulseMin: 0.88,
    pulseMax: 1.12,
    pulseDuration: 1100,
    irregular: true,
    blurPx: 7,
    label: 'check in',
  }
}

export default function Ouroboros({ risk = 1, size = '60vh', children, small = false }) {
  const style = useMemo(() => getRiskStyle(risk), [risk])
  const animRef = useRef(null)
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

      if (animRef.current) {
        animRef.current.style.transform = `scale(${scale})`
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [style])

  const svgSize = small ? '48px' : size
  const glowSize = small ? '64px' : `calc(${size} + 24px)`

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
        width: glowSize,
        height: glowSize,
        borderRadius: '50%',
        background: `radial-gradient(ellipse, ${style.glowColor} 30%, transparent 70%)`,
        transition: 'background 1.5s ease',
        pointerEvents: 'none',
      }} />

      {/* ouroboros image with pulse animation */}
      <img
        ref={animRef}
        src="/ouroboros.svg"
        alt="ouroboros"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: `${style.cssFilter} drop-shadow(0 0 ${style.blurPx * 2}px ${style.glowColor})`,
          transformOrigin: 'center center',
          transition: 'filter 1.5s ease',
          userSelect: 'none',
          pointerEvents: 'none',
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
            color: '#ff4422',
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
