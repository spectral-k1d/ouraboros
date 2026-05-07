let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export function playChime() {
  try {
    const audioCtx = getCtx()
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(220, audioCtx.currentTime)

    const now = audioCtx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.18, now + 0.3)
    gain.gain.setValueAtTime(0.18, now + 1.3)
    gain.gain.linearRampToValueAtTime(0, now + 1.8)

    osc.start(now)
    osc.stop(now + 1.8)
  } catch (e) {
    // audio not available — silent fail
  }
}

export function playAlarm() {
  try {
    const audioCtx = getCtx()
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, audioCtx.currentTime)
    osc.frequency.linearRampToValueAtTime(160, audioCtx.currentTime + 2)

    const now = audioCtx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.22, now + 0.5)
    gain.gain.setValueAtTime(0.22, now + 1.5)
    gain.gain.linearRampToValueAtTime(0, now + 2.5)

    osc.start(now)
    osc.stop(now + 2.5)
  } catch (e) {}
}
