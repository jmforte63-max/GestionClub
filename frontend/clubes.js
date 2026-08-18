document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#clubTable tbody');
  const form = document.getElementById('clubForm');

  async function loadClubs() {
    try {
      const response = await getClubs();
      tableBody.innerHTML = response.data.map(club => `
        <tr>
          <td>${club.nombre}</td>
          <td>${club.ciudad}</td>
          <td>${club.liga}</td>
          <td>${club.presidente}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error cargando clubes:', error);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      nombre: document.getElementById('nombre').value,
      ciudad: document.getElementById('ciudad').value,
      liga: document.getElementById('liga').value,
      presidente: document.getElementById('presidente').value,
      estadio: document.getElementById('estadio').value,
      fundacion: Number(document.getElementById('fundacion').value)
    };

    try {
      await fetch(`${window.APP_CONFIG.apiBaseUrl}/clubs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      form.reset();
      await loadClubs();
    } catch (error) {
      console.error('Error creando club:', error);
    }
  });

  loadClubs();
});
