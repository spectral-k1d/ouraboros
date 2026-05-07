import { useState, useEffect, useRef, useCallback } from 'react'
import Ouroboros from '../components/Ouroboros'
import CheckInOverlay from './CheckInOverlay'
import { calcInstantRisk, updateConsecutiveYes, isAlarm, pickSignals } from '../lib/riskScore'
import { playChime, playAlarm } from '../lib/audio'
import { saveDraft } from '../lib/localStorage'

const CHECK_IN_INTERVAL_MS = 5 * 60 * 1000 // 5 min
const CHECKIN_DUE_KEY = 'ouroboros_checkin_due'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function scheduleNextCheckIn() {
  localStorage.setItem(CHECKIN_DUE_KEY, String(Date.now() + CHECK_IN_INTERVAL_MS))
}

function clearCheckInDue() {
  localStorage.removeItem(CHECKIN_DUE_KEY)
}

function isCheckInDue() {
  const due = Number(localStorage.getItem(CHECKIN_DUE_KEY) || 0)
  return due > 0 && Date.now() >= due
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function sendCheckInNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const n = new Notification('ouroboros check-in', {
    body: 'Time for your 5-minute check-in. Tap to return.',
    icon: '/favicon.ico',
    requireInteraction: true,
    tag: 'ouroboros-checkin',
  })
  n.onclick = () => {
    window.focus()
    n.close()
  }
}

export default function ActiveSession({ session, onEnd, userId }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [instantRisk, setInstantRisk] = useState(1)
  const [consecutiveYes, setConsecutiveYes] = useState(0)
  const [usedSignalKeys, setUsedSignalKeys] = useState([])
  const [currentSignals, setCurrentSignals] = useState([])
  const [alarmActive, setAlarmActive] = useState(false)
  const startTimeRef = useRef(Date.now())
  const checkInPendingRef = useRef(false)

  // request notification permission on mount
  useEffect(() => {
    requestNotificationPermission()
    // schedule the first check-in
    scheduleNextCheckIn()
    return () => clearCheckInDue()
  }, [])

  // elapsed timer — uses absolute start time so background tabs stay accurate
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
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

  const triggerCheckIn = useCallback(() => {
    if (checkInPendingRef.current) return
    checkInPendingRef.current = true
    const signals = pickSignals(usedSignalKeys)
    setCurrentSignals(signals)
    setShowCheckIn(true)
    playChime()
    try { navigator.vibrate([200]) } catch {}
    // schedule the next check-in after this one fires
    scheduleNextCheckIn()
  }, [usedSignalKeys])

  // polling loop — checks every 10s if a check-in is overdue (works in background too)
  useEffect(() => {
    const id = setInterval(() => {
      if (!showCheckIn && isCheckInDue()) {
        triggerCheckIn()
        // if tab is in background, send a notification to bring them back
        if (document.visibilityState === 'hidden') {
          sendCheckInNotification()
        }
      }
    }, 10_000)
    return () => clearInterval(id)
  }, [showCheckIn, triggerCheckIn])

  // when tab becomes visible, immediately check if overdue
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && !showCheckIn && isCheckInDue()) {
        triggerCheckIn()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [showCheckIn, triggerCheckIn])

  function handleCheckInComplete(result) {
    checkInPendingRef.current = false
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
