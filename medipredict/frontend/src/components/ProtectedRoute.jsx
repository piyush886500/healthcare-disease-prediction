import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Mirrors the original Flask check on `/`:
//   if 'user_id' not in session: return redirect(url_for('login'))
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="page-loading">Checking session…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
