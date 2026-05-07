import { useState, useEffect, useRef, useCallback } from 'react'
import Ouroboros from '../components/Ouroboros'
import CheckInOverlay from './CheckInOverlay'
import { calcInstantRisk, updateConsecutiveYes, isAlarm, pickSignals } from '../lib/riskScore'
import { playChime, playAlarm } from '../lib/audio'
import { saveDraft } from '../lib/localStorage'

const CHECK_IN_INTERVAL_MS = 15 * 60 * 1000 // 15 min

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ActiveSession({ session, onEnd, userId }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [instantRisk, setInstantRisk] = useState(1)
  const [consecutiveYes, setConsecutiveYes] = useState(0)
  const [usedSignalKeys, setUsedSignalKeys] = useState([])
  const [currentSignals, setCurrentSignals] = useState([])
  const [alarmActive, setAlarmActive] = useState(false)
  const checkInTimerRef = useRef(null)
  const startTimeRef = useRef(Date.now())

  // elapsed timer
  useEffect(() => {
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsedSeconds(secs)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // save draft to localStorage on changes
  useEffect(() => {
    saveDraft({
      session,
      startedAt: new Date(startTimeRef.current).toISOString(),
      elapsedSeconds,
      instantRisk,
      consecutiveYes,
    })
  }, [elapsedSeconds, instantRisk, consecutiveYes, session])

  // check-in timer
  useEffect(() => {
    checkInTimerRef.current = setInterval(() => {
      triggerCheckIn()
    }, CHECK_IN_INTERVAL_MS)
    return () => clearInterval(checkInTimerRef.current)
  }, [usedSignalKeys, instantRisk, elapsedSeconds])

  function triggerCheckIn() {
    const signals = pickSignals(usedSignalKeys)
    setCurrentSignals(signals)
    setShowCheckIn(true)
    playChime()
    try { navigator.vibrate([200]) } catch {}
  }

  function handleCheckInComplete(result) {
    setShowCheckIn(false)
    const { groundedScore, yesCount, signalKeys } = result

    const newRisk = calcInstantRisk(groundedScore, yesCount)
    const newConsec = updateConsecutiveYes(consecutiveYes, yesCount)

    setInstantRisk(newRisk)
    setConsecutiveYes(newConsec)
    setUsedSignalKeys(prev => [...new Set([...prev, ...signalKeys])])

    if (isAlarm(newRisk, newConsec)) {
      setAlarmActive(true)
      playAlarm()
    } else {
      setAlarmActive(false)
    }
  }

  const sessionMinutes = elapsedSeconds / 60

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* debug/dev check-in trigger */}
      {import.meta.env.DEV && (
        <button
          onClick={triggerCheckIn}
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            fontSize: 11,
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            padding: '4px 8px',
            borderRadius: 3,
          }}
        >
          trigger check-in
        </button>
      )}

      <Ouroboros risk={instantRisk} size="62vh">
        <div style={{
          fontSize: 22,
          fontWeight: 300,
          letterSpacing: '0.04em',
          color: 'var(--text)',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'monospace',
          opacity: 0.85,
        }}>
          {formatTime(elapsedSeconds)}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'lowercase',
          marginTop: 4,
        }}>
          {session.platform} · {session.topic_category}
        </div>
      </Ouroboros>

      <button
        onClick={() => onEnd(instantRisk)}
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 12,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'lowercase',
          padding: '6px 12px',
        }}
      >
        end session
      </button>

      {showCheckIn && (
        <CheckInOverlay
          signals={currentSignals}
          instantRisk={instantRisk}
          sessionMinutes={sessionMinutes}
          onComplete={handleCheckInComplete}
        />
      )}
    </div>
  )
}
