document.addEventListener('DOMContentLoaded', async () => {
  const statsClubes = document.getElementById('statsClubes');
  const statsJugadores = document.getElementById('statsJugadores');
  const statsEventos = document.getElementById('statsEventos');

  try {
    const response = await getDashboardStats();
    const { totalClubes, totalJugadores, totalEventos } = response.data;

    statsClubes.textContent = totalClubes;
    statsJugadores.textContent = totalJugadores;
    statsEventos.textContent = totalEventos;
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
});
