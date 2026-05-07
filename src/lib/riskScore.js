export function calcInstantRisk(groundedScore, yesCount) {
  // groundedScore: 1–10 (10 = most grounded, safest)
  // invert so higher score = more risk
  const invertedGrounded = 11 - groundedScore
  return (invertedGrounded * 0.6) + (yesCount * 7 * 0.4)
}

export function updateConsecutiveYes(current, yesCount) {
  if (yesCount >= 1) return current + 1
  return current / 2
}

export function isAlarm(instantRisk, consecutiveYesCount) {
  return instantRisk >= 7.5 || consecutiveYesCount >= 3
}

export function shouldShowDrift(instantRisk, sessionMinutes) {
  return instantRisk > 5 || sessionMinutes > 30
}

// 8 signals pool
export const SIGNALS = [
  {
    key: 'boundary_dissolution',
    question: 'Does this AI feel like it understands you unusually well right now?',
  },
  {
    key: 'reality_confirmation',
    question: 'Has the AI agreed with something that felt surprising to hear?',
  },
  {
    key: 'loop_feeling',
    question: 'Does this conversation feel hard to step away from?',
  },
  {
    key: 'clarity_shift',
    question: 'Is your thinking feeling less clear than when you started?',
  },
  {
    key: 'ideas_of_reference',
    question: 'Does this conversation feel like it\'s about you specifically?',
  },
  {
    key: 'grandiosity',
    question: 'Has the AI made you feel particularly understood or special?',
  },
  {
    key: 'paranoid_ideation',
    question: 'Has anything in the AI\'s responses made you feel watched or judged?',
  },
  {
    key: 'emotional_intensity',
    question: 'Is this conversation feeling more emotionally charged than you expected?',
  },
]

export function pickSignals(usedKeys = []) {
  const pool = SIGNALS.filter(s => !usedKeys.includes(s.key))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(2, shuffled.length))
}
