const apiBaseUrl = window.APP_CONFIG.apiBaseUrl;

async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición');
  }

  return data;
}

async function getDashboardStats() {
  return apiFetch('/metrics');
}

async function getClubs() {
  return apiFetch('/clubs');
}

async function getPlayers() {
  return apiFetch('/players');
}

async function getAgenda() {
  return apiFetch('/agenda');
}
