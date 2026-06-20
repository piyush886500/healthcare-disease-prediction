import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import client from '../api/client'
import client from '../api/client'

// login function should use:
const response = await client.post('/api/login', { username, password })
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkSession = useCallback(async () => {
    try {
      const res = await client.get('/api/me')
      setUser(res.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

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
