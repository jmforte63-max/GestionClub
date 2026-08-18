import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const apiBaseUrl = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`
)

window.APP_CONFIG = { apiBaseUrl }

const originalFetch = window.fetch.bind(window)
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('http://localhost:5000/api')) {
    return originalFetch(input.replace('http://localhost:5000/api', apiBaseUrl), init)
  }

  if (typeof input === 'string' && input.startsWith('http://localhost:5000')) {
    return originalFetch(input.replace('http://localhost:5000', window.location.origin), init)
  }

  return originalFetch(input, init)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
