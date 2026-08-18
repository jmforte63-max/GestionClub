const getApiBaseUrl = () => {
  const configuredUrl = window.APP_CONFIG?.VITE_API_URL || import.meta?.env?.VITE_API_URL;

  if (configuredUrl) {
    return `${configuredUrl.replace(/\/$/, '')}/api`;
  }

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocalhost ? 'http://localhost:5000/api' : `${window.location.origin}/api`;
};

window.APP_CONFIG = {
  ...window.APP_CONFIG,
  apiBaseUrl: getApiBaseUrl(),
};
