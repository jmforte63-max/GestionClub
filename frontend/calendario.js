document.addEventListener('DOMContentLoaded', async () => {
  const agendaList = document.getElementById('agendaList');

  try {
    const response = await getAgenda();
    agendaList.innerHTML = response.data.map(item => `
      <div class="list-item">
        <h4>${item.evento}</h4>
        <p>${item.fecha} · ${item.lugar}</p>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error cargando agenda:', error);
  }
});
