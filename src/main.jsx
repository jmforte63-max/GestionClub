import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  return isLocalhost ? 'http://localhost:5000' : window.location.origin
}

const apiBaseUrl = `${getApiBaseUrl()}/api`
window.APP_CONFIG = { apiBaseUrl }

const originalFetch = window.fetch.bind(window)
window.fetch = (input, init) => {
  const urlString = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : ''

  if (!urlString) {
    return originalFetch(input, init)
  }

  if (urlString.startsWith('http://localhost:5000/api')) {
    return originalFetch(urlString.replace('http://localhost:5000/api', apiBaseUrl), init)
  }

  if (urlString.startsWith('http://localhost:5000')) {
    return originalFetch(urlString.replace('http://localhost:5000', getApiBaseUrl()), init)
  }

  return originalFetch(input, init)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
