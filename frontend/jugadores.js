document.addEventListener('DOMContentLoaded', async () => {
  const clubsSelect = document.getElementById('clubId');
  const playerTableBody = document.querySelector('#playerTable tbody');
  const form = document.getElementById('playerForm');

  async function loadClubsForSelect() {
    const response = await getClubs();
    const clubs = response.data;
    clubsSelect.innerHTML = clubs.map(club => `
      <option value="${club.id}">${club.nombre}</option>
    `).join('');
  }

  async function loadPlayers() {
    const response = await getPlayers();
    const clubs = await getClubs();
    const clubMap = Object.fromEntries(clubs.data.map(club => [club.id, club.nombre]));

    playerTableBody.innerHTML = response.data.map(player => `
      <tr>
        <td>${player.nombre}</td>
        <td>${clubMap[player.clubId] || 'Sin club'}</td>
        <td>${player.posicion}</td>
        <td>${player.edad}</td>
      </tr>
    `).join('');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      clubId: Number(clubsSelect.value),
      nombre: document.getElementById('nombreJugador').value,
      posicion: document.getElementById('posicion').value,
      edad: Number(document.getElementById('edad').value),
      nacionalidad: document.getElementById('nacionalidad').value,
      valor: Number(document.getElementById('valor').value)
    };

    try {
      await fetch(`${window.APP_CONFIG.apiBaseUrl}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      form.reset();
      await loadPlayers();
    } catch (error) {
      console.error('Error creando jugador:', error);
    }
  });

  await loadClubsForSelect();
  await loadPlayers();
});
