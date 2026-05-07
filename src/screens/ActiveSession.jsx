import { useState, useEffect, useRef, useCallback } from 'react'
import OuroborosRing from '../components/OuroborosRing'
import CheckInOverlay from './CheckInOverlay'
import { calcInstantRisk, updateConsecutiveYes, isAlarm, pickSignals } from '../lib/riskScore'
import { scoreToColor } from '../lib/danger'
import { playChime, playAlarm } from '../lib/audio'
import { saveDraft } from '../lib/localStorage'
import { supabase } from '../lib/supabase'

const CHECK_IN_INTERVAL_MS = 15 * 1000
const CHECKIN_DUE_KEY = 'ouroboros_checkin_due'

const SIGNAL_KEYS = [
  'boundary_dissolution', 'reality_confirmation', 'loop_feeling', 'clarity_shift',
  'ideas_of_reference', 'grandiosity', 'paranoid_ideation', 'emotional_intensity',
]
const SIGNAL_LABELS = {
  boundary_dissolution: 'boundary', reality_confirmation: 'reality',
  loop_feeling: 'loop', clarity_shift: 'clarity',
  ideas_of_reference: 'reference', grandiosity: 'grandiosity',
  paranoid_ideation: 'paranoid', emotional_intensity: 'emotional',
}

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
function clearCheckInDue() { localStorage.removeItem(CHECKIN_DUE_KEY) }
function isCheckInDue() {
  const due = Number(localStorage.getItem(CHECKIN_DUE_KEY) || 0)
  return due > 0 && Date.now() >= due
}

async function requestNotificationPermission() {
  if (!('Notification' in window) || Notification.permission !== 'default') return
  await Notification.requestPermission()
}

function sendCheckInNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const n = new Notification('ouroboros check-in', {
    body: 'Time for your 5-minute check-in.',
    icon: '/favicon.ico',
    requireInteraction: true,
    tag: 'ouroboros-checkin',
  })
  n.onclick = () => { window.focus(); n.close() }
}

// mini signal bar chart for history panel
function SignalBars({ log }) {
  if (!log) return null
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 20, marginTop: 6 }}>
      {SIGNAL_KEYS.map(k => {
        const val = log[k] || 0
        return (
          <div key={k} title={SIGNAL_LABELS[k]} style={{
            width: 14,
            height: `${Math.max(2, (val / 10) * 20)}px`,
            background: val >= 7 ? '#c84040' : val >= 4 ? '#c0802a' : '#555550',
            borderRadius: 1,
            flexShrink: 0,
          }} />
        )
      })}
    </div>
  )
}

// session card used in the history panel
function SessionCard({ s }) {
  const log = s.post_session_logs?.[0] ?? null
  const danger = s.danger_score ?? 0
  const color = scoreToColor(danger)
  return (
    <div style={{
      padding: '14px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text)' }}>
            {s.platform || '—'} · {s.topic_category || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {new Date(s.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {s.duration_minutes ? ` · ${s.duration_minutes}m` : ''}
          </div>
        </div>
        <div style={{ fontSize: 11, color, fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>
          {danger > 0 ? danger.toFixed(1) : '—'}
        </div>
      </div>
      {/* danger bar */}
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(danger / 10) * 100}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.5s',
        }} />
      </div>
      <SignalBars log={log} />
    </div>
  )
}

export default function ActiveSession({ session, onEnd, userId, user }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [instantRisk, setInstantRisk] = useState(1)
  const [consecutiveYes, setConsecutiveYes] = useState(0)
  const [usedSignalKeys, setUsedSignalKeys] = useState([])
  const [currentSignals, setCurrentSignals] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [prevSessions, setPrevSessions] = useState([])
  const [sessionsLoaded, setSessionsLoaded] = useState(false)

  const ouroborosRef = useRef(null)
  const startTimeRef = useRef(Date.now())
  const checkInPendingRef = useRef(false)

  const username = user?.email?.split('@')[0] || 'user'
  const ringSize = 620

  // notification permission + first check-in schedule
  useEffect(() => {
    requestNotificationPermission()
    scheduleNextCheckIn()
    return () => clearCheckInDue()
  }, [])

  // elapsed timer — re-syncs immediately on tab return
  useEffect(() => {
    function sync() {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }
    const id = setInterval(sync, 1000)
    function onVisible() { if (document.visibilityState === 'visible') sync() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  // save draft
  useEffect(() => {
    saveDraft({ session, startedAt: new Date(startTimeRef.current).toISOString(), elapsedSeconds, instantRisk, consecutiveYes })
  }, [elapsedSeconds, instantRisk, consecutiveYes, session])

  // keep ouroboros in sync with risk — imperative, no re-render
  useEffect(() => {
    // map instantRisk (0–~10) to danger score (0–10)
    ouroborosRef.current?.setScore(Math.min(10, instantRisk))
  }, [instantRisk])

  const triggerCheckIn = useCallback(() => {
    if (checkInPendingRef.current) return
    checkInPendingRef.current = true
    setCurrentSignals(pickSignals(usedSignalKeys))
    setShowCheckIn(true)
    playChime()
    try { navigator.vibrate([200]) } catch {}
    scheduleNextCheckIn()
  }, [usedSignalKeys])

  // polling loop for check-in due
  useEffect(() => {
    const id = setInterval(() => {
      if (!showCheckIn && isCheckInDue()) {
        triggerCheckIn()
        if (document.visibilityState === 'hidden') sendCheckInNotification()
      }
    }, 1_000)
    return () => clearInterval(id)
  }, [showCheckIn, triggerCheckIn])

  // check on tab return
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && !showCheckIn && isCheckInDue()) triggerCheckIn()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [showCheckIn, triggerCheckIn])

  async function openPanel() {
    setPanelOpen(p => !p)
    if (!sessionsLoaded) {
      const { data } = await supabase
        .from('sessions')
        .select('*, post_session_logs(*)')
        .eq('user_id', userId)
        .neq('session_id', session.session_id)
        .order('started_at', { ascending: false })
        .limit(20)
      setPrevSessions(data || [])
      setSessionsLoaded(true)
    }
  }

  function handleCheckInComplete(result) {
    checkInPendingRef.current = false
    setShowCheckIn(false)
    const { groundedScore, yesCount, signalKeys } = result
    const newRisk = calcInstantRisk(groundedScore, yesCount)
    const newConsec = updateConsecutiveYes(consecutiveYes, yesCount)
    setInstantRisk(newRisk)
    setConsecutiveYes(newConsec)
    setUsedSignalKeys(prev => [...new Set([...prev, ...signalKeys])])
    if (isAlarm(newRisk, newConsec)) playAlarm()
  }

  const sessionMinutes = elapsedSeconds / 60

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* ouroboros ring — always mounted, never conditional, never receives changing props */}
      <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
        <OuroborosRing ref={ouroborosRef} size={ringSize} />
        {/* timer overlay — positioned over the canvas center */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.04em', color: 'var(--text)', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', opacity: 0.85 }}>
            {formatTime(elapsedSeconds)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'lowercase', marginTop: 4 }}>
            {session.platform} · {session.topic_category}
          </div>
        </div>
      </div>

      {/* dev trigger */}
      {import.meta.env.DEV && (
        <button onClick={triggerCheckIn} style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 3 }}>
          trigger check-in
        </button>
      )}

      {/* username — clicking toggles history panel */}
      <button
        onClick={openPanel}
        style={{ position: 'fixed', top: 16, right: 16, fontSize: 12, color: panelOpen ? 'var(--text)' : 'var(--text-muted)', letterSpacing: '0.06em', zIndex: 30 }}
      >
        {username}
      </button>

      {/* end session */}
      <button
        onClick={() => onEnd(instantRisk)}
        style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'lowercase', padding: '6px 12px' }}
      >
        end session
      </button>

      {/* history panel — overlays from right, session continues behind */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: panelOpen ? 288 : 0,
        opacity: panelOpen ? 1 : 0,
        overflow: 'hidden',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 20,
        transition: 'width 0.3s ease, opacity 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '24px 20px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              history
            </span>
            <button
              onClick={() => setPanelOpen(false)}
              style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1, padding: 4 }}
            >
              ×
            </button>
          </div>
          {!sessionsLoaded ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>loading…</p>
          ) : prevSessions.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>no previous sessions.</p>
          ) : (
            prevSessions.map(s => <SessionCard key={s.session_id} s={s} />)
          )}
        </div>
      </div>

      {/* check-in overlay — on top of everything */}
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
