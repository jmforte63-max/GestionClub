import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const originalFetch = window.fetch.bind(window)
window.fetch = (input, init) => {
  const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : ''

  if (target.startsWith('http://localhost:5000')) {
    const nextUrl = import.meta.env.PROD ? target.replace(/^http:\/\/localhost:5000/i, '') : target
    return originalFetch(nextUrl, init)
  }

  return originalFetch(input, init)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
