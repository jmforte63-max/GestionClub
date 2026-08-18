import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../api';

export default function Clubes({ selectedClub = 'all' }) {
  const [clubes, setClubes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingClubId, setEditingClubId] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    ciudad: '',
    liga: '',
    estadio: '',
    presupuesto: '',
    escudo_url: '',
    estado: 'Activo',
  });
  const [form, setForm] = useState({
    nombre: '',
    ciudad: '',
    liga: '',
    estadio: '',
    presupuesto: '',
    escudo_url: '',
  });

  const totalPresupuesto = useMemo(
    () => clubes.reduce((sum, club) => sum + Number(club.presupuesto || 0), 0),
    [clubes]
  );

  useEffect(() => {
    const cargarClubes = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const query = usuario?.rol === 'admin' && usuario?.email === 'admin@club.com' && selectedClub && selectedClub !== 'all'
          ? `?clubId=${encodeURIComponent(selectedClub)}`
          : '';

        console.log('Cargando clubes desde ' + apiUrl(`/api/clubes${query}`));
        const response = await fetch(apiUrl(`/api/clubes${query}`), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Respuesta de clubes:', data);

        setClubes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error al cargar clubes:', err);
        setError('No se pudieron cargar los clubes. Comprueba que el backend está arrancado en el puerto 5000.');
      } finally {
        setLoading(false);
      }
    };

    cargarClubes();
  }, [selectedClub]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const addClub = async () => {
    const nombre = form.nombre.trim();
    const ciudad = form.ciudad.trim();
    const liga = form.liga.trim();
    const estadio = form.estadio.trim();
    const presupuesto = Number(form.presupuesto);
    const escudoUrl = String(form.escudo_url || '').trim();

    if (!nombre || !ciudad || !liga || !estadio || !form.presupuesto) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (escudoUrl && !/^https?:\/\//i.test(escudoUrl)) {
      setError('La URL del escudo debe empezar por http:// o https://');
      return;
    }

    if (Number.isNaN(presupuesto) || presupuesto <= 0) {
      setError('El presupuesto debe ser un número mayor que 0.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Guardando club:', { nombre, ciudad, liga, estadio, presupuesto, escudo_url: escudoUrl });

      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/clubes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre,
          ciudad,
          liga,
          estadio,
          presupuesto,
          escudo_url: escudoUrl,
          estado: 'Activo',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP ${response.status}`);
      }

      console.log('Club guardado correctamente:', data);
      setClubes((prev) => [...prev, data]);
      setForm({ nombre: '', ciudad: '', liga: '', estadio: '', presupuesto: '', escudo_url: '' });
      setSuccess('Club guardado correctamente.');
    } catch (err) {
      console.error('Error al guardar club:', err);
      setError(err.message || 'No se pudo guardar el club. Revisa que el backend esté funcionando.');
    } finally {
      setLoading(false);
    }
  };

  const updateClubStatus = async (id, nuevoEstado) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/clubes/${id}/estado`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo actualizar el estado del club');
      }

      setClubes((prev) => prev.map((club) => club.id === id ? { ...club, estado: nuevoEstado } : club));
      setSuccess(`Estado del club actualizado a ${nuevoEstado}.`);
    } catch (err) {
      console.error('Error al actualizar estado del club:', err);
      setError(err.message || 'No se pudo actualizar el estado del club.');
    }
  };

  const removeClub = async (id) => {
    const confirmado = window.confirm('¿Seguro que quieres eliminar este club? Esta acción no se puede deshacer.');
    if (!confirmado) return;

    setError('');
    setSuccess('');

    try {
      console.log('Eliminando club con id:', id);
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/clubes/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP ${response.status}`);
      }

      setClubes((prev) => prev.filter((club) => club.id !== id));
      setSuccess('Club eliminado correctamente.');
    } catch (err) {
      console.error('Error al eliminar club:', err);
      setError(err.message || 'No se pudo eliminar el club.');
    }
  };

  const startEditClub = (club) => {
    setEditingClubId(club.id);
    setEditForm({
      nombre: club.nombre || '',
      ciudad: club.ciudad || '',
      liga: club.liga || '',
      estadio: club.estadio || '',
      presupuesto: String(club.presupuesto ?? ''),
      escudo_url: club.escudo_url || '',
      estado: club.estado || 'Activo',
    });
    setError('');
    setSuccess('');
  };

  const cancelEditClub = () => {
    setEditingClubId(null);
    setEditForm({
      nombre: '',
      ciudad: '',
      liga: '',
      estadio: '',
      presupuesto: '',
      escudo_url: '',
      estado: 'Activo',
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEditClub = async () => {
    const clubId = editingClubId;
    if (!clubId) return;

    const nombre = editForm.nombre.trim();
    const ciudad = editForm.ciudad.trim();
    const liga = editForm.liga.trim();
    const estadio = editForm.estadio.trim();
    const presupuesto = Number(editForm.presupuesto);
    const escudoUrl = String(editForm.escudo_url || '').trim();

    if (!nombre || !ciudad || !liga || !estadio || !editForm.presupuesto) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (escudoUrl && !/^https?:\/\//i.test(escudoUrl)) {
      setError('La URL del escudo debe empezar por http:// o https://');
      return;
    }

    if (Number.isNaN(presupuesto) || presupuesto <= 0) {
      setError('El presupuesto debe ser un número mayor que 0.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/clubes/${clubId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre,
          ciudad,
          liga,
          estadio,
          presupuesto,
          escudo_url: escudoUrl,
          estado: editForm.estado,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP ${response.status}`);
      }

      setClubes((prev) => prev.map((club) => club.id === clubId ? { ...club, ...data.club } : club));
      setSuccess('Club actualizado correctamente.');
      cancelEditClub();
    } catch (err) {
      console.error('Error al editar club:', err);
      setError(err.message || 'No se pudo actualizar el club.');
    }
  };

  return (
    <>
      <section className="panel-grid">
        <div className="card metric-card positive">
          <h3>Clubes activos</h3>
          <p className="metric-value">{clubes.length}</p>
        </div>
        <div className="card metric-card info">
          <h3>Presupuesto total</h3>
          <p className="metric-value">€{totalPresupuesto.toLocaleString()}</p>
        </div>
        <div className="card metric-card warning">
          <h3>Promedio</h3>
          <p className="metric-value">€{Math.round(totalPresupuesto / Math.max(clubes.length, 1)).toLocaleString()}</p>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <section className="card section-card clubs-form-panel">
        <div className="section-header">
          <h2>Listado de clubes</h2>
        </div>

        <div className="club-form-grid">
          <label className="club-field">
            <span>Nombre del club</span>
            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre del club" />
          </label>
          <label className="club-field">
            <span>Ciudad</span>
            <input name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Ciudad" />
          </label>
          <label className="club-field">
            <span>Liga</span>
            <input name="liga" value={form.liga} onChange={handleChange} placeholder="Liga" />
          </label>
          <label className="club-field">
            <span>Estadio</span>
            <input name="estadio" value={form.estadio} onChange={handleChange} placeholder="Estadio" />
          </label>
          <label className="club-field">
            <span>Presupuesto</span>
            <input name="presupuesto" type="number" value={form.presupuesto} onChange={handleChange} placeholder="100000" />
          </label>
          <label className="club-field full-width">
            <span>URL del escudo</span>
            <input name="escudo_url" type="url" value={form.escudo_url} onChange={handleChange} placeholder="https://example.com/escudo.png" />
          </label>
          <div className="club-form-actions full-width">
            <button className="primary-button" onClick={addClub} disabled={loading}>Guardar club</button>
          </div>
        </div>

        {loading && <p>Cargando clubes...</p>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Escudo</th>
                <th>Club</th>
                <th>Ciudad</th>
                <th>Liga</th>
                <th>Estadio</th>
                <th>Presupuesto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clubes.map((club) => {
                const isEditing = editingClubId === club.id;

                return (
                  <tr key={club.id}>
                    <td>
                      <img
                        src={club.escudo_url || 'https://via.placeholder.com/40x40?text=Club'}
                        alt={`${club.nombre} escudo`}
                        className="club-table-shield"
                      />
                    </td>
                    <td>
                      {isEditing ? (
                        <input className="club-inline-input" name="nombre" value={editForm.nombre} onChange={handleEditChange} />
                      ) : (
                        club.nombre
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input className="club-inline-input" name="ciudad" value={editForm.ciudad} onChange={handleEditChange} />
                      ) : (
                        club.ciudad
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input className="club-inline-input" name="liga" value={editForm.liga} onChange={handleEditChange} />
                      ) : (
                        club.liga
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input className="club-inline-input" name="estadio" value={editForm.estadio} onChange={handleEditChange} />
                      ) : (
                        club.estadio
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input className="club-inline-input" name="presupuesto" type="number" value={editForm.presupuesto} onChange={handleEditChange} />
                      ) : (
                        `€${Number(club.presupuesto || 0).toLocaleString()}`
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          name="estado"
                          value={editForm.estado}
                          onChange={handleEditChange}
                          className="status-select"
                          style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Activo">Activo</option>
                          <option value="Rechazado">Rechazado</option>
                          <option value="Inactivo">Inactivo (impago)</option>
                        </select>
                      ) : (
                        <select
                          value={club.estado || 'Pendiente'}
                          onChange={(event) => updateClubStatus(club.id, event.target.value)}
                          className="status-select"
                          style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Activo">Activo</option>
                          <option value="Rechazado">Rechazado</option>
                          <option value="Inactivo">Inactivo (impago)</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <div className="club-action-buttons">
                        {isEditing ? (
                          <>
                            <button className="primary-button" onClick={saveEditClub}>Guardar</button>
                            <button className="secondary-button" onClick={cancelEditClub}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="primary-button" onClick={() => startEditClub(club)}>Editar</button>
                            <button className="delete-button" onClick={() => removeClub(club.id)}>Eliminar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
