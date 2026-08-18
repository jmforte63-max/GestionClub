import { useEffect, useState } from 'react';
import '../styles/Jugadores.css';

export default function Jugadores({ selectedClub = 'all' }) {
  const [jugadores, setJugadores] = useState([]);
  const [nuevoJugador, setNuevoJugador] = useState({
    nombre: '',
    posicion: '',
    numero: '',
  });

  const cargarJugadores = async () => {
    try {
      const token = localStorage.getItem('token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const query = usuario?.rol === 'admin' && usuario?.email === 'admin@club.com' && selectedClub && selectedClub !== 'all'
        ? `?clubId=${encodeURIComponent(selectedClub)}`
        : '';

      const response = await fetch(`http://localhost:5000/api/jugadores${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setJugadores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar jugadores:', error);
      setJugadores([]);
    }
  };

  useEffect(() => {
    cargarJugadores();
  }, [selectedClub]);

  const agregarJugador = async () => {
    if (!nuevoJugador.nombre || !nuevoJugador.posicion || !nuevoJugador.numero) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/jugadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: nuevoJugador.nombre,
          posicion: nuevoJugador.posicion,
          numero: Number(nuevoJugador.numero),
          estado: 'Activo'
        })
      });

      if (!response.ok) throw new Error('Error al crear jugador');
      setNuevoJugador({ nombre: '', posicion: '', numero: '' });
      cargarJugadores();
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarJugador = async (id) => {
    const confirmado = window.confirm('¿Seguro que quieres eliminar este jugador?');
    if (!confirmado) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/jugadores/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarJugadores();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="jugadores-container">
      <h1>👥 Gestión de Jugadores</h1>

      <div className="form-section">
        <h2>Agregar Nuevo Jugador</h2>
        <div className="form-group">
          <input
            type="text"
            placeholder="Nombre"
            value={nuevoJugador.nombre}
            onChange={(e) => setNuevoJugador({ ...nuevoJugador, nombre: e.target.value })}
          />
          <select
            value={nuevoJugador.posicion}
            onChange={(e) => setNuevoJugador({ ...nuevoJugador, posicion: e.target.value })}
          >
            <option value="">Selecciona posición</option>
            <option value="Portero">Portero</option>
            <option value="Defensa">Defensa</option>
            <option value="Centrocampista">Centrocampista</option>
            <option value="Delantero">Delantero</option>
          </select>
          <input
            type="number"
            placeholder="Número"
            value={nuevoJugador.numero}
            onChange={(e) => setNuevoJugador({ ...nuevoJugador, numero: e.target.value })}
          />
          <button onClick={agregarJugador}>Agregar</button>
        </div>
      </div>

      <div className="players-list">
        <h2>Lista de Jugadores ({jugadores.length})</h2>
        <div className="players-grid">
          {jugadores.map(jugador => (
            <div key={jugador.id} className="player-card">
              <div className="player-number">{jugador.numero}</div>
              <h3>{jugador.nombre}</h3>
              <p><strong>Posición:</strong> {jugador.posicion}</p>
              <p><strong>Estado:</strong> <span className={`badge ${String(jugador.estado || 'activo').toLowerCase()}`}>{jugador.estado || 'Activo'}</span></p>
              <button className="delete-btn" onClick={() => eliminarJugador(jugador.id)}>Eliminar</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
