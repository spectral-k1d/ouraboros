import { useRef, useEffect, useImperativeHandle, forwardRef, memo } from 'react'
import { scoreToColor } from '../lib/danger'

// OuroborosRing — SVG-mask based, imperative score API.
// Animation runs once in useEffect([]) — never restarts on parent re-renders.
// Update score via ref: ouroborosRef.current.setScore(n)

const OuroborosRing = memo(forwardRef(function OuroborosRing({ size = 500 }, ref) {
  const maskRef  = useRef(null)
  const outerRef = useRef(null)
  const scoreRef = useRef(0)
  const frameRef = useRef(null)

  useImperativeHandle(ref, () => ({
    setScore(n) { scoreRef.current = Math.max(0, Math.min(10, n)) },
  }), [])

  useEffect(() => {
    const startTime = performance.now()

    function loop(now) {
      const t     = (now - startTime) / 1000
      const score = scoreRef.current

      // 4-wave composite pulse — irregular, alive
      const pulse =
        Math.sin(t * 1.2)  * 0.38 +
        Math.sin(t * 2.6)  * 0.27 +
        Math.sin(t * 0.75) * 0.22 +
        Math.sin(t * 4.1)  * 0.13
      const normPulse = pulse / (0.38 + 0.27 + 0.22 + 0.13) // –1 to 1

      // pulse range widens with danger
      const range = 0.025 + (score / 10) * 0.075
      const scale = 1 + normPulse * range

      // brightness flicker — independent sine
      const brightness = 0.82 + 0.16 * Math.sin(t * 3.3) + 0.04 * Math.sin(t * 7.1)

      // edge blur on the outer wrapper (applied after mask → feathers shape edges)
      const blurPx = score > 5 ? ((score - 5) / 5) * Math.abs(normPulse) * 9 : 0

      if (maskRef.current) {
        maskRef.current.style.backgroundColor = scoreToColor(score)
        maskRef.current.style.transform = `scale(${scale.toFixed(4)})`
        maskRef.current.style.filter = `brightness(${brightness.toFixed(3)})`
      }
      if (outerRef.current) {
        outerRef.current.style.filter = blurPx > 0.3 ? `blur(${blurPx.toFixed(1)}px)` : ''
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, []) // empty — never restarts

  return (
    <div
      ref={outerRef}
      style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}
    >
      <div
        ref={maskRef}
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
          backgroundColor: '#f0ede8',
          transformOrigin: 'center center',
          willChange: 'transform, background-color',
        }}
      />
    </div>
  )
}))

export default OuroborosRing
