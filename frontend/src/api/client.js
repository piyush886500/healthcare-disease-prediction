import axios from 'axios'

// Empty string => requests go to the same origin the page was served from.
// For two separate Render services (frontend + backend), this must be set
// explicitly via VITE_API_BASE_URL in the frontend's environment variables.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default client