import { useState, useEffect } from 'react'
import Ouroboros from '../components/Ouroboros'
import { supabase } from '../lib/supabase'
import { scoreToColor } from '../lib/danger'

const SIGNAL_KEYS = [
  'boundary_dissolution',
  'reality_confirmation',
  'loop_feeling',
  'clarity_shift',
  'ideas_of_reference',
  'grandiosity',
  'paranoid_ideation',
  'emotional_intensity',
]

const SIGNAL_LABELS = {
  boundary_dissolution: 'boundary',
  reality_confirmation: 'reality',
  loop_feeling: 'loop',
  clarity_shift: 'clarity',
  ideas_of_reference: 'reference',
  grandiosity: 'grandiosity',
  paranoid_ideation: 'paranoid',
  emotional_intensity: 'emotional',
}

function formatDuration(session) {
  if (session?.ended_at && session?.started_at) {
    const totalSecs = Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 1000)
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }
  const minutes = session?.duration_minutes
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export default function Dashboard({ userId, onNewSession, onViewPublic, user }) {
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [logs, setLogs] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [ratingsOpen, setRatingsOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  useEffect(() => {
    loadSessions()
  }, [userId])

  useEffect(() => {
    setNotes(selectedSession?.session_notes || '')
    setRatingsOpen(false)
  }, [selectedSession?.session_id])

  async function loadSessions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
    if (error) console.error('sessions fetch error:', error)
    setSessions(data || [])
    if (data && data.length > 0) {
      setSelectedSession(data[0])
      await loadSessionDetail(data[0].session_id)
    }
    setLoading(false)
  }

  async function loadSessionDetail(sessionId) {
    const [logsRes, checkinsRes] = await Promise.all([
      supabase.from('post_session_logs').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
      supabase.from('checkins').select('*').eq('session_id', sessionId).order('timestamp', { ascending: true }),
    ])
    setLogs(logsRes.data || [])
    setCheckins(checkinsRes.data || [])
  }

  async function handleSelectSession(session) {
    setSelectedSession(session)
    await loadSessionDetail(session.session_id)
  }

  async function handleDeleteSession(session) {
    if (!window.confirm(`Delete session from ${new Date(session.started_at).toLocaleDateString()}? This cannot be undone.`)) return
    setDeleting(true)
    await supabase.from('sessions').delete().eq('session_id', session.session_id)
    const updated = sessions.filter(s => s.session_id !== session.session_id)
    setSessions(updated)
    if (selectedSession?.session_id === session.session_id) {
      if (updated.length > 0) {
        setSelectedSession(updated[0])
        await loadSessionDetail(updated[0].session_id)
      } else {
        setSelectedSession(null)
        setLogs([])
        setCheckins([])
      }
    }
    setDeleting(false)
  }

  async function handleNotesSave() {
    if (!selectedSession) return
    setNotesSaving(true)
    await supabase
      .from('sessions')
      .update({ session_notes: notes })
      .eq('session_id', selectedSession.session_id)
    // update local cache so switching sessions preserves saved note
    setSessions(prev => prev.map(s =>
      s.session_id === selectedSession.session_id ? { ...s, session_notes: notes } : s
    ))
    setNotesSaving(false)
  }

  const lastRisk = selectedSession?.danger_score ?? 1
  const alias = user?.user_metadata?.alias || 'you'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ouroboros risk={1} size="400px" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        <Ouroboros risk={1} size="460px" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>no sessions yet.</p>
          <button
            onClick={onNewSession}
            style={{ padding: '10px 24px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14, letterSpacing: '0.08em' }}
          >
            start first session
          </button>
        </div>
      </div>
    )
  }

  const wc = wordCount(notes)

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* sidebar */}
      <div style={{
        width: 240,
        borderRight: '1px solid var(--border)',
        padding: '32px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            sessions
          </p>
          <button
            onClick={onNewSession}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 3, fontSize: 12, letterSpacing: '0.06em', textAlign: 'left' }}
          >
            + new session
          </button>
        </div>

        {sessions.map(s => (
          <div key={s.session_id} style={{ position: 'relative' }}>
            <button
              onClick={() => handleSelectSession(s)}
              style={{
                width: '100%',
                padding: '10px 32px 10px 12px',
                textAlign: 'left',
                borderRadius: 3,
                background: selectedSession?.session_id === s.session_id ? 'var(--surface2)' : 'transparent',
                border: selectedSession?.session_id === s.session_id ? '1px solid var(--border)' : '1px solid transparent',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <div style={{ color: 'var(--text)' }}>{s.platform || 'session'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {new Date(s.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' · '}{s.topic_category}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {formatDuration(s)}
              </div>
            </button>
            <button
              onClick={() => handleDeleteSession(s)}
              disabled={deleting}
              title="delete session"
              style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', opacity: 0.4, padding: '4px', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          {user?.user_metadata?.consent_aggregate && (
            <button
              onClick={onViewPublic}
              style={{ width: '100%', padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'left' }}
            >
              view public dashboard →
            </button>
          )}
        </div>
      </div>

      {/* main content */}
      <div style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>{alias}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Ouroboros risk={lastRisk} small />
        </div>

        {selectedSession && (
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              selected session
            </p>

            {/* meta row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'platform', val: selectedSession.platform },
                { label: 'topic', val: selectedSession.topic_category },
                { label: 'duration', val: formatDuration(selectedSession) },
                { label: 'date', val: new Date(selectedSession.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              ].map(item => (
                <div key={item.label} style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 14 }}>{item.val || '—'}</div>
                </div>
              ))}
            </div>

            {/* check-ins */}
            {checkins.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                  check-ins ({checkins.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {checkins.map((c, i) => (
                    <div key={c.checkin_id} style={{
                      padding: '12px 16px',
                      background: 'var(--surface2)',
                      borderRadius: 4,
                      display: 'grid',
                      gridTemplateColumns: '80px 80px 1fr',
                      gap: 16,
                      alignItems: 'center',
                      fontSize: 12,
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        #{i + 1} · {new Date(c.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>grounded: <strong>{c.grounded_score ?? '—'}</strong></span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        risk: {c.instant_risk_score ?? '—'}
                        {c.break_nudge_shown ? ' · nudge shown' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* post-session ratings — collapsible */}
            {logs.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <button
                  onClick={() => setRatingsOpen(o => !o)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: ratingsOpen ? 12 : 0,
                    opacity: 1,
                  }}
                >
                  <span>post-session ratings</span>
                  <span style={{ fontSize: 10, transition: 'transform 0.2s', display: 'inline-block', transform: ratingsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                </button>

                {ratingsOpen && (
                  <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {SIGNAL_KEYS.map(k => {
                      const val = logs[0]?.[k]
                      return (
                        <div key={k} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 4 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            {SIGNAL_LABELS[k]}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 300 }}>{val ?? '—'}</div>
                          {val != null && (
                            <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${val * 10}%`,
                                background: val >= 7 ? '#e05c5c' : val >= 4 ? '#c9a84c' : 'var(--text-muted)',
                                borderRadius: 2,
                              }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* personal notes */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  personal notes
                </p>
                <span style={{ fontSize: 11, color: wc > 100 ? '#e05c5c' : 'var(--text-muted)' }}>
                  {wc}/100 words
                </span>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={handleNotesSave}
                placeholder="private notes about this session..."
                rows={4}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  fontSize: 13,
                  lineHeight: 1.6,
                  padding: '12px 14px',
                  borderColor: wc > 100 ? '#e05c5c' : undefined,
                }}
              />
              {wc > 100 && (
                <p style={{ fontSize: 11, color: '#e05c5c', marginTop: 4 }}>
                  {wc - 100} word{wc - 100 !== 1 ? 's' : ''} over limit — trim before it saves
                </p>
              )}
              {notesSaving && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>saving…</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
