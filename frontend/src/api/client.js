import axios from 'axios'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''

const client = axios.create({
  baseURL:         API_BASE_URL,
  withCredentials: true,    // ← MUST be true — backend uses httponly cookies
  timeout:         15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Response interceptor ───────────────────────────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject(
        new Error('The server is waking up — please wait 30 seconds and try again.')
      )
    }
    if (!error.response) {
      return Promise.reject(
        new Error('Cannot reach the server. Check your connection.')
      )
    }
    if (error.response.status === 401) {
      // Don't redirect if already on auth pages
      if (!window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')) {
        localStorage.removeItem('medipredict_user')
        window.location.href = '/login'
      }
      return Promise.reject(new Error('Session expired. Please log in again.'))
    }
    if (error.response.status >= 500) {
      return Promise.reject(new Error('Server error. Please try again shortly.'))
    }
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong.'
    return Promise.reject(new Error(message))
  }
)

// ── Wake backend on app load ───────────────────────────────────────────────
export async function wakeBackend() {
  if (!API_BASE_URL) return
  try {
    await axios.get(`${API_BASE_URL}/health`, { timeout: 60000 })
  } catch {}
}

export default client