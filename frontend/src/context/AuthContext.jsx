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

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext