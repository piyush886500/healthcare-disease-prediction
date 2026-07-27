import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // ── On every page load — verify session cookie with backend ───────────────
  // Your backend uses httponly cookies (not JWT in localStorage).
  // The ONLY way to know if the user is still logged in after a reload
  // is to ask the backend via GET /api/me — the cookie goes automatically.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await client.get('/api/me')
        // Cookie is valid — restore user
        setUser(res.data)
        // Keep localStorage in sync so we have a username to display
        localStorage.setItem('medipredict_user', JSON.stringify(res.data))
      } catch {
        // Cookie missing or expired — clear everything
        localStorage.removeItem('medipredict_user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    restoreSession()
  }, [])

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res  = await client.post('/api/login', { email, password })
    const data = res.data
    // Backend sets httponly session cookie automatically in the response.
    // We just store the user object for the UI.
    const userObj = {
      user_id:  data.user_id,
      username: data.username,
      email,
    }
    localStorage.setItem('medipredict_user', JSON.stringify(userObj))
    setUser(userObj)
    return userObj
  }, [])

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (username, email, password) => {
    const res = await client.post('/api/register', { username, email, password })
    return res.data
  }, [])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await client.post('/api/logout') } catch {}
    localStorage.removeItem('medipredict_user')
    setUser(null)
  }, [])

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