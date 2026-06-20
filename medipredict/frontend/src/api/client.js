import axios from 'axios'

// Empty string => requests go to the same origin the page was served from.
// This is correct once frontend + backend are deployed together (Render).
// For local dev with two separate servers, set VITE_API_BASE_URL in .env
// (e.g. http://localhost:8000).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default client