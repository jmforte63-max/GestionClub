import { useEffect, useState } from 'react';
import { apiUrl } from '../api';
import '../styles/Calendario.css';

export default function Calendario({ selectedClub = 'all', selectedSeason = '', onSeasonChange }) {
  const obtenerTemporadaDesdeFecha = (fecha) => {
    if (!fecha) {
      const ahora = new Date();
      const anioActual = ahora.getFullYear();
      return ahora.getMonth() >= 6 ? `${anioActual}/${String(anioActual + 1).slice(-2)}` : `${anioActual - 1}/${String(anioActual).slice(-2)}`;
    }

    const fechaObj = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(fechaObj.getTime())) {
      return selectedSeason || obtenerTemporadaDesdeFecha(new Date().toISOString().slice(0, 10));
    }

    const anio = fechaObj.getFullYear();
    return fechaObj.getMonth() >= 6 ? `${anio}/${String(anio + 1).slice(-2)}` : `${anio - 1}/${String(anio).slice(-2)}`;
  };

  const [eventos, setEventos] = useState([]);
  const [nuevoEvento, setNuevoEvento] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    hora: '',
    tipo: '',
    descripcion: '',
    ubicacion: '',
    temporada: obtenerTemporadaDesdeFecha(new Date().toISOString().slice(0, 10)),
  });

  const tipos = ['Partido', 'Entrenamiento', 'Asamblea', 'Evento Social', 'Otro'];

  const cargarEventos = async () => {
    try {
      const token = localStorage.getItem('token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const params = new URLSearchParams();

      if (usuario?.rol === 'admin' && usuario?.email === 'admin@club.com' && selectedClub && selectedClub !== 'all') {
        params.set('clubId', String(selectedClub));
      }

      if (selectedSeason) {
        params.set('temporada', selectedSeason);
      }

      params.set('_', String(Date.now()));
      const response = await fetch(apiUrl(`/api/eventos?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setEventos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar eventos:', error);
      setEventos([]);
    }
  };

  useEffect(() => {
    cargarEventos();
  }, [selectedClub, selectedSeason]);

  const agregarEvento = async () => {
    if (!nuevoEvento.fecha || !nuevoEvento.hora || !nuevoEvento.tipo || !nuevoEvento.descripcion) return;

    try {
      const token = localStorage.getItem('token');
      const temporadaGuardada = nuevoEvento.temporada || obtenerTemporadaDesdeFecha(nuevoEvento.fecha);
      const response = await fetch(apiUrl('/api/eventos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fecha: nuevoEvento.fecha,
          hora: nuevoEvento.hora,
          tipo: nuevoEvento.tipo,
          descripcion: nuevoEvento.descripcion,
          ubicacion: nuevoEvento.ubicacion,
          temporada: temporadaGuardada
        })
      });

      if (!response.ok) throw new Error('Error al crear evento');
      if (onSeasonChange && temporadaGuardada && temporadaGuardada !== selectedSeason) {
        onSeasonChange(temporadaGuardada);
      }
      setNuevoEvento({
        fecha: new Date().toISOString().slice(0, 10),
        hora: '',
        tipo: '',
        descripcion: '',
        ubicacion: '',
        temporada: obtenerTemporadaDesdeFecha(new Date().toISOString().slice(0, 10))
      });
      cargarEventos();
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarEvento = async (id) => {
    const confirmado = window.confirm('¿Seguro que quieres eliminar este evento?');
    if (!confirmado) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(apiUrl(`/api/eventos/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarEventos();
    } catch (error) {
      console.error(error);
    }
  };

  const incluirEnTemporada = (fechaValor) => {
    if (!fechaValor || !selectedSeason) return true;

    const fecha = new Date(fechaValor);
    if (Number.isNaN(fecha.getTime())) return true;

    const match = String(selectedSeason).match(/^(\d{4})\/(\d{2})$/);
    if (!match) return true;

    const comienzo = Number(match[1]);
    const fin = Number(`20${match[2]}`);
    const anio = fecha.getFullYear();

    return anio >= comienzo && anio <= fin;
  };

  const eventosTemporada = eventos.filter((evento) => incluirEnTemporada(evento.fecha));
  const eventosOrdenados = [...eventosTemporada].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  return (
    <div className="calendario-container">
      <h1>📅 Calendario de Eventos</h1>

      <div className="form-section">
        <h2>Agendar Nuevo Evento</h2>
        <div className="form-group">
          <input
            type="date"
            value={nuevoEvento.fecha}
            onChange={(e) => setNuevoEvento({
              ...nuevoEvento,
              fecha: e.target.value,
              temporada: obtenerTemporadaDesdeFecha(e.target.value)
            })}
          />
          <input
            type="time"
            value={nuevoEvento.hora}
            onChange={(e) => setNuevoEvento({ ...nuevoEvento, hora: e.target.value })}
          />
          <select
            value={nuevoEvento.tipo}
            onChange={(e) => setNuevoEvento({ ...nuevoEvento, tipo: e.target.value })}
          >
            <option value="">Selecciona tipo de evento</option>
            {tipos.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Descripción"
            value={nuevoEvento.descripcion}
            onChange={(e) => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
          />
          <input
            type="text"
            placeholder="Ubicación"
            value={nuevoEvento.ubicacion}
            onChange={(e) => setNuevoEvento({ ...nuevoEvento, ubicacion: e.target.value })}
          />
          <button onClick={agregarEvento}>Agendar Evento</button>
        </div>
      </div>

      <div className="eventos-list">
        <h2>Próximos Eventos ({eventosOrdenados.length})</h2>
        <div className="eventos-grid">
          {eventosOrdenados.map(evento => (
            <div key={evento.id} className={`evento-card ${String(evento.tipo || '').toLowerCase().replace(' ', '-')}`}>
              <div className="evento-header">
                <span className="evento-tipo">{evento.tipo}</span>
              </div>
              <div className="evento-body">
                <h3>{evento.descripcion}</h3>
                <p><strong>📅 Fecha:</strong> {evento.fecha}</p>
                <p><strong>⏰ Hora:</strong> {evento.hora}</p>
                <p><strong>📍 Ubicación:</strong> {evento.ubicacion}</p>
              </div>
              <button className="delete-btn" onClick={() => eliminarEvento(evento.id)}>Eliminar</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
