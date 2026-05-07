import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Ouroboros from '../components/Ouroboros'

export default function Auth() {
  const [mode, setMode] = useState('signup') // 'signup' | 'login'
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { alias, consent_aggregate: consent },
      },
    })
    if (signupErr) {
      setError(signupErr.message)
      setLoading(false)
      return
    }
    // upsert user row
    if (data.user) {
      await supabase.from('users').upsert({
        user_id: data.user.id,
        consent_aggregate: consent,
      })
    }
    setMessage('check your email to confirm your account.')
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
    if (loginErr) {
      setError(loginErr.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: 48,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Ouroboros risk={1.5} size="220px" />
        <div style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'lowercase' }}>
          ouroboros
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 380 }} className="fade-in">
        <h2 style={{ marginBottom: 6, fontSize: 18 }}>
          {mode === 'signup' ? 'create account' : 'sign in'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
          {mode === 'signup'
            ? 'track your mental state during ai sessions.'
            : 'welcome back.'}
        </p>

        <form onSubmit={mode === 'signup' ? handleSignup : handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                name or alias
              </label>
              <input
                type="text"
                value={alias}
                onChange={e => setAlias(e.target.value)}
                placeholder="how should we call you?"
                required={mode === 'signup'}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="at least 6 characters"
              minLength={6}
              required
            />
          </div>

          {mode === 'signup' && (
            <label style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              cursor: 'pointer',
              padding: '14px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              marginTop: 4,
            }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                style={{ width: 'auto', marginTop: 3, accentColor: 'var(--text)' }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                contribute anonymized data to the public study — your signal patterns are aggregated
                with others so researchers can see how ai conversations affect mental state over time.
                you can change this later.
              </span>
            </label>
          )}

          {error && (
            <p style={{ fontSize: 12, color: '#c0392b', margin: 0 }}>{error}</p>
          )}
          {message && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '12px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--text)',
              fontSize: 14,
              letterSpacing: '0.08em',
              transition: 'all 0.3s',
              opacity: loading ? 0.5 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '...' : (mode === 'signup' ? 'create account' : 'sign in')}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          {mode === 'signup' ? (
            <>already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(null) }}
                style={{ color: 'var(--text)', textDecoration: 'underline', fontSize: 12 }}>
                sign in
              </button>
            </>
          ) : (
            <>new here?{' '}
              <button onClick={() => { setMode('signup'); setError(null) }}
                style={{ color: 'var(--text)', textDecoration: 'underline', fontSize: 12 }}>
                create account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
