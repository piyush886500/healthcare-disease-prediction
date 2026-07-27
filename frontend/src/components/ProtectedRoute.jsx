import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // ── Still checking localStorage — show spinner, DO NOT redirect yet ────────
  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 14, color: '#6B7280',
      }}>
        <Spinner />
        <span style={{ fontSize: 14 }}>Checking session…</span>
      </div>
    )
  }

  // ── No user after check — redirect to login ────────────────────────────────
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ── Authenticated — render the page ───────────────────────────────────────
  return children
}

function Spinner() {
  return (
    <>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid #E5E7EB',
        borderTop: '3px solid #3B4DB8',
        animation: 'pr-spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes pr-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}