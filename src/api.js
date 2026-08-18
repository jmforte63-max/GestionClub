export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const configuredUrl = import.meta.env.VITE_API_URL
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  const hostname = window.location.hostname
  return ['localhost', '127.0.0.1'].includes(hostname)
    ? 'http://localhost:5000'
    : window.location.origin
}

export const apiUrl = (path = '') => {
  const normalizedPath = typeof path === 'string' ? path : ''
  const base = getApiBaseUrl()

  if (!normalizedPath) {
    return base
  }

  if (/^https?:\/\//.test(normalizedPath)) {
    return normalizedPath
  }

  const withLeadingSlash = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  return `${base}${withLeadingSlash}`
}
