import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const WAKE_TIMEOUT_MS = 3000
const GIVE_UP_MS      = 60000

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [slowWarning,setSlowWarning]= useState(false)
  const [timedOut,   setTimedOut]   = useState(false)

  // ── Cleanup timers on unmount ──────────────────────────────────────────────
  useEffect(() => {
    let slow, giveUp
    if (submitting) {
      slow   = setTimeout(() => setSlowWarning(true),  WAKE_TIMEOUT_MS)
      giveUp = setTimeout(() => {
        setTimedOut(true)
        setSubmitting(false)
        setSlowWarning(false)
        setError('The server took too long to respond. It may be waking up — please wait 30 seconds and try again.')
      }, GIVE_UP_MS)
    } else {
      setSlowWarning(false)
    }
    return () => { clearTimeout(slow); clearTimeout(giveUp) }
  }, [submitting])

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    setError('')
    setTimedOut(false)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(
        err.message ||
        err.response?.data?.detail ||
        'Invalid email or password ❌'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const btnLabel = submitting
    ? slowWarning ? 'Server waking up…' : 'Signing in…'
    : timedOut    ? 'Retry'
    : 'Sign in'

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark" />
        </div>
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to check your symptoms.</p>

        {/* ── Error banner ───────────────────────────────────────────── */}
        {error && (
          <div className="form-error" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>{error}</span>
            {(timedOut || error.includes('waking')) && (
              <button
                type="button"
                onClick={() => handleSubmit()}
                style={{
                  alignSelf: 'flex-start', background: 'none',
                  border: '1px solid currentColor', borderRadius: 6,
                  padding: '4px 12px', fontSize: 13, cursor: 'pointer',
                  color: 'inherit', fontFamily: 'inherit',
                }}
              >
                🔄 Try again
              </button>
            )}
          </div>
        )}

        {/* ── Slow-server notice ─────────────────────────────────────── */}
        {slowWarning && !error && (
          <div style={{
            background: '#FEF3C7', border: '1px solid #FCD34D',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12,
            fontSize: 13, color: '#92400E', display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span>⏳</span>
            <span>The server is waking up (free tier). This may take up to 30 seconds — please wait.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {submitting && <ButtonSpinner />}
            {btnLabel}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  )
}

function ButtonSpinner() {
  return (
    <span style={{
      width: 14, height: 14, borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTop: '2px solid white',
      display: 'inline-block', flexShrink: 0,
      animation: 'btn-spin 0.7s linear infinite',
    }}>
      <style>{`@keyframes btn-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}