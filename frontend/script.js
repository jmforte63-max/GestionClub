document.addEventListener('DOMContentLoaded', async () => {
  const totalClubesEl = document.getElementById('totalClubes');
  const totalJugadoresEl = document.getElementById('totalJugadores');
  const totalEventosEl = document.getElementById('totalEventos');
  const proximoEventoEl = document.getElementById('proximoEvento');
  const clubListEl = document.getElementById('clubList');
  const playerListEl = document.getElementById('playerList');

  try {
    const statsResponse = await getDashboardStats();
    const clubsResponse = await getClubs();
    const playersResponse = await getPlayers();

    const metrics = statsResponse.data;
    totalClubesEl.textContent = metrics.totalClubes;
    totalJugadoresEl.textContent = metrics.totalJugadores;
    totalEventosEl.textContent = metrics.totalEventos;
    proximoEventoEl.textContent = metrics.proximoEvento?.evento || 'Sin eventos';

    const clubs = clubsResponse.data;
    const players = playersResponse.data;

    if (clubListEl) {
      clubListEl.innerHTML = clubs.slice(0, 3).map(club => `
        <div class="list-item">
          <h4>${club.nombre}</h4>
          <p>${club.ciudad} · ${club.liga}</p>
        </div>
      `).join('');
    }

    if (playerListEl) {
      playerListEl.innerHTML = players.slice(0, 3).map(player => `
        <div class="list-item">
          <h4>${player.nombre}</h4>
          <p>${player.posicion} · ${player.nacionalidad}</p>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error cargando dashboard:', error);
    if (totalClubesEl) totalClubesEl.textContent = '—';
    if (totalJugadoresEl) totalJugadoresEl.textContent = '—';
    if (totalEventosEl) totalEventosEl.textContent = '—';
    if (proximoEventoEl) proximoEventoEl.textContent = 'Error';
  }
});
