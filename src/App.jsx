import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { loadDraft, clearDraft } from './lib/localStorage'

import Auth from './screens/Auth'
import SessionStart from './screens/SessionStart'
import ActiveSession from './screens/ActiveSession'
import PostSessionLog from './screens/PostSessionLog'
import SessionSummary from './screens/SessionSummary'
import Dashboard from './screens/Dashboard'
import PublicDashboard from './screens/PublicDashboard'
import DraftRecovery from './components/DraftRecovery'

const VIEWS = {
  AUTH: 'auth',
  DASHBOARD: 'dashboard',
  SESSION_START: 'session_start',
  ACTIVE: 'active',
  POST_LOG: 'post_log',
  SUMMARY: 'summary',
  PUBLIC: 'public',
}

export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState(VIEWS.AUTH)
  const [activeSession, setActiveSession] = useState(null)
  const [lastRisk, setLastRisk] = useState(1)
  const [postRatings, setPostRatings] = useState(null)
  const [draft, setDraft] = useState(null)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '')
  }, [theme])

  // auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user)
        checkDraft()
        setView(VIEWS.DASHBOARD)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
        setView(VIEWS.DASHBOARD)
      } else {
        setUser(null)
        setView(VIEWS.AUTH)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  function checkDraft() {
    const d = loadDraft()
    if (d) setDraft(d)
  }

  function handleRecoverDraft() {
    if (!draft) return
    setActiveSession(draft.session)
    setLastRisk(draft.instantRisk || 1)
    clearDraft()
    setDraft(null)
    setView(VIEWS.ACTIVE)
  }

  function handleDiscardDraft() {
    clearDraft()
    setDraft(null)
  }

  async function handleStartSession({ platform, topic_category }) {
    const sessionData = {
      user_id: user.id,
      platform,
      topic_category,
      started_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single()
    if (error) {
      console.error('session insert error', error)
      // proceed with local session even if DB fails
      setActiveSession({ ...sessionData, session_id: 'local-' + Date.now() })
    } else {
      setActiveSession(data)
    }
    setView(VIEWS.ACTIVE)
  }

  async function handleEndSession(risk) {
    setLastRisk(risk)
    if (activeSession?.session_id && !activeSession.session_id.startsWith('local-')) {
      const endedAt = new Date().toISOString()
      const startedAt = new Date(activeSession.started_at)
      const durationMinutes = Math.round((Date.now() - startedAt.getTime()) / 60000)
      await supabase
        .from('sessions')
        .update({ ended_at: endedAt, duration_minutes: durationMinutes })
        .eq('session_id', activeSession.session_id)
    }
    clearDraft()
    setView(VIEWS.POST_LOG)
  }

  async function handlePostLogComplete({ ratings, platform, topic }) {
    setPostRatings(ratings)
    if (activeSession?.session_id && !activeSession.session_id.startsWith('local-')) {
      await supabase.from('post_session_logs').insert({
        session_id: activeSession.session_id,
        ...ratings,
      })
      if (platform !== activeSession.platform || topic !== activeSession.topic_category) {
        await supabase.from('sessions').update({ platform, topic_category: topic })
          .eq('session_id', activeSession.session_id)
      }
    }
    setView(VIEWS.SUMMARY)
  }

  async function handleCorrection({ key, original, corrected, note }) {
    if (!activeSession?.session_id) return
    await supabase.from('user_corrections').insert({
      log_id: null,
      checkin_id: null,
      original_value: String(original),
      corrected_value: String(corrected),
      user_note: note || null,
      user_id: user?.id || null,
    })
  }

  function handleThemeToggle() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <>
      {/* theme toggle — always visible when logged in */}
      {user && (
        <button
          onClick={handleThemeToggle}
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            fontSize: 11,
            color: 'var(--text-muted)',
            zIndex: 200,
            letterSpacing: '0.06em',
          }}
        >
          {theme === 'dark' ? 'light' : 'dark'}
        </button>
      )}

      {/* sign out when on dashboard */}
      {user && view === VIEWS.DASHBOARD && (
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            fontSize: 11,
            color: 'var(--text-muted)',
            zIndex: 200,
            letterSpacing: '0.06em',
          }}
        >
          sign out
        </button>
      )}

      {draft && view === VIEWS.DASHBOARD && (
        <DraftRecovery
          draft={draft}
          onRecover={handleRecoverDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {view === VIEWS.AUTH && <Auth />}

      {view === VIEWS.DASHBOARD && user && (
        <Dashboard
          userId={user.id}
          user={user}
          onNewSession={() => setView(VIEWS.SESSION_START)}
          onViewPublic={() => setView(VIEWS.PUBLIC)}
        />
      )}

      {view === VIEWS.SESSION_START && (
        <SessionStart onStart={handleStartSession} />
      )}

      {view === VIEWS.ACTIVE && activeSession && (
        <ActiveSession
          session={activeSession}
          userId={user?.id}
          onEnd={handleEndSession}
        />
      )}

      {view === VIEWS.POST_LOG && (
        <PostSessionLog
          session={activeSession}
          lastRisk={lastRisk}
          onComplete={handlePostLogComplete}
        />
      )}

      {view === VIEWS.SUMMARY && postRatings && (
        <SessionSummary
          ratings={postRatings}
          lastRisk={lastRisk}
          onCorrect={handleCorrection}
          onDone={() => setView(VIEWS.DASHBOARD)}
        />
      )}

      {view === VIEWS.PUBLIC && (
        <PublicDashboard onBack={() => setView(VIEWS.DASHBOARD)} />
      )}
    </>
  )
}
