import { createContext, useContext, useState, useEffect } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)  // ← TRUE until we've checked storage

  // ── On every page load/refresh — restore session from localStorage ─────────
  useEffect(() => {
    const stored = localStorage.getItem('medipredict_user')
    const token  = localStorage.getItem('medipredict_token')

    if (stored && token) {
      try {
        setUser(JSON.parse(stored))  // restore user object silently
      } catch {
        // Corrupt data — clear it
        localStorage.removeItem('medipredict_user')
        localStorage.removeItem('medipredict_token')
      }
    }

    // Done checking — now ProtectedRoute can decide
    setLoading(false)
  }, [])

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await client.post('/api/login', { email, password })
    const data = res.data

    // Persist so reload doesn't log user out
    localStorage.setItem('medipredict_user',  JSON.stringify(data))
    localStorage.setItem('medipredict_token', data.access_token || data.token || 'session')

    setUser(data)
    return data
  }

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (username, email, password) => {
    const res = await client.post('/api/register', { username, email, password })
    return res.data
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try { await client.post('/api/logout') } catch {}  // best-effort
    localStorage.removeItem('medipredict_user')
    localStorage.removeItem('medipredict_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}