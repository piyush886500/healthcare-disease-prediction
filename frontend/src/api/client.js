import axios from 'axios'

// ── Base URL ──────────────────────────────────────────────────────────────────
// Set VITE_API_BASE_URL in Render frontend environment variables.
// e.g. https://medipredict-backend.onrender.com
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''

// ── Axios instance ────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL:         API_BASE_URL,
  withCredentials: false,        // ← was true: caused CORS preflight failures on Render
  timeout:         15000,        // ← NEW: 15s timeout — stops infinite hangs
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor — attach JWT token if present ─────────────────────────
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — unified error handling ─────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Timeout — backend likely sleeping (Render free tier cold start)
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject(
        new Error('The server is taking too long to respond. It may be waking up — please try again in 30 seconds.')
      )
    }

    // Network error — no response at all
    if (!error.response) {
      return Promise.reject(
        new Error('Cannot reach the server. Please check your connection and try again.')
      )
    }

    // 401 — token expired, redirect to login
    if (error.response.status === 401) {
      localStorage.removeItem('token')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(new Error('Session expired. Please log in again.'))
    }

    // 404 — route not found on backend
    if (error.response.status === 404) {
      return Promise.reject(new Error('Requested resource not found.'))
    }

    // 500 — backend crash
    if (error.response.status >= 500) {
      return Promise.reject(new Error('Server error. Please try again shortly.'))
    }

    // All other errors — use backend's detail message if available
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong.'

    return Promise.reject(new Error(message))
  }
)

// ── Wake-up ping — call this on app load to pre-warm Render backend ───────────
// Import and call wakeBackend() in main.jsx or App.jsx
export async function wakeBackend() {
  if (!API_BASE_URL) return
  try {
    await axios.get(`${API_BASE_URL}/health`, { timeout: 60000 })
  } catch {
    // Silent — just warming up the server, not critical
  }
}

export default client