export const WEIGHTS = {
  boundary_dissolution: 1.1,
  reality_confirmation: 1.0,
  loop_feeling: 1.0,
  clarity_shift: 1.0,
  ideas_of_reference: 1.3,
  grandiosity: 0.9,
  paranoid_ideation: 1.5,
  emotional_intensity: 0.9,
  grounded: 1.2,
}

export function calcDanger(scores) {
  let weightedSum = 0
  let totalWeight = 0
  for (const [k, v] of Object.entries(scores)) {
    if (v == null) continue
    const w = WEIGHTS[k] || 1
    weightedSum += v * w
    totalWeight += w
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

// score 0–10 → rgb string
export function scoreToColor(score) {
  const s = Math.max(0, Math.min(10, score))
  const stops = [
    [0,  [240, 237, 232]],
    [3,  [240, 210, 140]],
    [5,  [210, 140,  40]],
    [7,  [190,  60,  10]],
    [10, [150,  15,   8]],
  ]
  for (let i = 0; i < stops.length - 1; i++) {
    const [s0, c0] = stops[i]
    const [s1, c1] = stops[i + 1]
    if (s <= s1) {
      const t = (s - s0) / (s1 - s0)
      return `rgb(${Math.round(c0[0] + t * (c1[0] - c0[0]))},${Math.round(c0[1] + t * (c1[1] - c0[1]))},${Math.round(c0[2] + t * (c1[2] - c0[2]))})`
    }
  }
  return 'rgb(150,15,8)'
}
