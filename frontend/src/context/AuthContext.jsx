import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await client.post('/api/login', { username, password })
      if (data.access_token) {
        localStorage.setItem('token', data.access_token)
        setUser(data.user)
        return { success: true }
      } else {
        setError(data.error || 'Invalid credentials')
        return { success: false }
      }
    } catch (err) {
      setError('Connection error')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (username, email, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await client.post('/api/register', { username, email, password })
      return { success: true, data }
    } catch (err) {
      setError('Registration failed')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setUser({ username: 'user', email: 'user@medipredict.com' })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {import { createContext, useContext, useState } from 'react'
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
  return useContext(AuthContext)
}

export default AuthContext