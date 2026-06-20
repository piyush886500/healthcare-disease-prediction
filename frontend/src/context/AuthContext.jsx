import { createContext, useContext, useState } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Always start logged out — even if a session cookie from a previous
  // visit is still valid, the app requires a fresh login every time it
  // starts (e.g. on every page load/refresh).
  const [user, setUser] = useState(null)

  const login = async (email, password) => {
    const res = await client.post('/api/login', { email, password })
    setUser(res.data)
    return res.data
  }

  const register = async (username, email, password) => {
    const res = await client.post('/api/register', { username, email, password })
    return res.data
  }

  const logout = async () => {
    await client.post('/api/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading: false, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}