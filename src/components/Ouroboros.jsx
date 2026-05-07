import { useEffect, useRef, useMemo } from 'react'

// Returns CSS color and animation parameters based on risk score 0–10
function getRiskStyle(risk) {
  if (risk < 4) {
    return {
      stroke: '#f0ede8',
      glow: 'rgba(240,237,232,0.06)',
      pulseMin: 0.97,
      pulseMax: 1.03,
      pulseDuration: 4000,
      irregular: false,
      bleedProgress: 0,
      label: null,
    }
  }
  if (risk < 6) {
    return {
      stroke: '#e8c0b8',
      glow: 'rgba(232,192,184,0.1)',
      pulseMin: 0.96,
      pulseMax: 1.04,
      pulseDuration: 3000,
      irregular: false,
      bleedProgress: (risk - 4) / 2,
      label: null,
    }
  }
  if (risk < 7.5) {
    return {
      stroke: '#d4654a',
      glow: 'rgba(212,101,74,0.18)',
      pulseMin: 0.94,
      pulseMax: 1.06,
      pulseDuration: 2200,
      irregular: false,
      bleedProgress: (risk - 6) / 1.5,
      label: null,
    }
  }
  if (risk < 9) {
    const t = (risk - 7.5) / 1.5
    return {
      stroke: `rgb(${Math.round(200 + t * 55)}, ${Math.round(40 - t * 30)}, ${Math.round(30 - t * 20)})`,
      glow: `rgba(220,40,30,${0.2 + t * 0.15})`,
      pulseMin: 0.91,
      pulseMax: 1.09,
      pulseDuration: 1600,
      irregular: true,
      bleedProgress: 0.6 + t * 0.4,
      label: 'check in',
    }
  }
  return {
    stroke: '#ff1a0a',
    glow: 'rgba(255,26,10,0.45)',
    pulseMin: 0.88,
    pulseMax: 1.12,
    pulseDuration: 1100,
    irregular: true,
    bleedProgress: 1,
    label: 'check in',
  }
}

export default function Ouroboros({ risk = 1, size = '60vh', children, small = false }) {
  const style = useMemo(() => getRiskStyle(risk), [risk])
  const animRef = useRef(null)
  const tRef = useRef(0)
  const frameRef = useRef(null)
  const svgRef = useRef(null)

  useEffect(() => {
    let start = null
    const animate = (ts) => {
      if (!start) start = ts
      const elapsed = ts - start
      tRef.current = elapsed

      const duration = style.pulseDuration
      let phase = (elapsed % duration) / duration // 0–1

      let scale
      if (style.irregular) {
        // add noise to the phase for irregular feel
        const noise = Math.sin(elapsed * 0.003) * 0.15 + Math.sin(elapsed * 0.0071) * 0.08
        phase = (phase + noise) % 1
        if (phase < 0) phase += 1
      }

      const t = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
      scale = style.pulseMin + (style.pulseMax - style.pulseMin) * t

      if (animRef.current) {
        animRef.current.style.transform = `scale(${scale})`
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [style])

  // Build SVG filter string based on bleed progress
  const filterUrl = `url(#ouroboros-filter-${Math.round(risk * 10)})`
  const turbFreq = 0.02 + style.bleedProgress * 0.06
  const blurAmount = 1 + style.bleedProgress * 4

  const svgSize = small ? '48px' : size

  return (
    <div
      style={{
        position: 'relative',
        width: svgSize,
        height: svgSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <defs>
          <filter id={`ouroboros-filter-${Math.round(risk * 10)}`} x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={`${turbFreq} ${turbFreq * 1.3}`}
              numOctaves="4"
              seed="42"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={style.bleedProgress * 14}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur
              in="displaced"
              stdDeviation={blurAmount}
              result="blurred"
            />
            <feComposite in="blurred" in2="SourceGraphic" operator="over" />
          </filter>

          {/* glow layer */}
          <filter id="glow-filter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={small ? 3 : 8} result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>

        {/* glow halo */}
        <g filter="url(#glow-filter)" opacity={style.bleedProgress * 0.7}>
          <OuroborosPath stroke={style.glow} strokeWidth={small ? 20 : 32} />
        </g>

        {/* main ring */}
        <g
          ref={animRef}
          style={{
            transformOrigin: '200px 200px',
            filter: `url(#ouroboros-filter-${Math.round(risk * 10)})`,
            transition: 'filter 1.2s ease',
          }}
        >
          <OuroborosPath stroke={style.stroke} strokeWidth={small ? 5 : 10} />
        </g>
      </svg>

      {/* center content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}>
        {children}
        {style.label && !small && (
          <div style={{
            fontSize: '11px',
            letterSpacing: '0.15em',
            color: style.stroke,
            textTransform: 'lowercase',
            marginTop: 8,
            opacity: 0.9,
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

// The hand-drawn-looking ouroboros path — irregular ink ring
function OuroborosPath({ stroke, strokeWidth }) {
  return (
    <path
      d="
        M 200 52
        C 242 46, 283 58, 315 82
        C 348 108, 365 146, 368 182
        C 371 214, 362 246, 345 270
        C 328 295, 303 314, 276 326
        C 248 339, 215 344, 184 340
        C 152 335, 120 321, 96 298
        C 71 275, 54 243, 48 208
        C 42 172, 49 133, 67 103
        C 86 71, 118 49, 154 43
        C 172 40, 192 41, 200 52

        M 200 88
        C 232 84, 263 95, 287 115
        C 312 136, 327 166, 330 196
        C 333 224, 325 254, 308 276
        C 291 299, 265 315, 237 322
        C 208 329, 177 326, 151 314
        C 124 301, 103 279, 91 253
        C 79 226, 77 195, 86 168
        C 95 140, 115 116, 141 103
        C 167 89, 197 86, 200 88
      "
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: 'stroke 1.5s ease' }}
    />
  )
}
