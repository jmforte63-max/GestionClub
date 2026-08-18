import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { apiUrl } from '../api';

export default function ValidacionClubes() {
  const [clubesPendientes, setClubesPendientes] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargarPendientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/clubes/pendientes'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los clubs pendientes');
      }

      setClubesPendientes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Error al cargar clubs pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPendientes();
  }, []);

  const validarClub = async (id, estado = 'Activo') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/clubes/${id}/validar`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo actualizar el estado del club');
      }

      const nombreClub = data.club?.nombre || 'Club';
      if (estado === 'Activo') {
        toast.success(`✅ Club validado: ${nombreClub}`);
      } else if (estado === 'Rechazado') {
        toast.warning(`⚠️ Club rechazado: ${nombreClub}`);
      } else {
        toast.info(`ℹ️ Estado actualizado: ${nombreClub}`);
      }

      setClubesPendientes((prev) => prev.filter((club) => club.id !== id));
    } catch (error) {
      toast.error(error.message || 'Error al cambiar el estado del club');
    }
  };

  return (
    <div className="card section-card">
      <div className="section-header">
        <h2>Validación de nuevos clubs</h2>
      </div>

      {loading ? (
        <p>Cargando clubs pendientes...</p>
      ) : clubesPendientes.length === 0 ? (
        <p>No hay clubs pendientes de validación.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Club</th>
                <th>Ciudad</th>
                <th>Liga</th>
                <th>Estadio</th>
                <th>Presupuesto</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {clubesPendientes.map((club) => (
                <tr key={club.id}>
                  <td>{club.nombre}</td>
                  <td>{club.ciudad}</td>
                  <td>{club.liga}</td>
                  <td>{club.estadio}</td>
                  <td>€{Number(club.presupuesto || 0).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        defaultValue={club.estado || 'Pendiente'}
                        onChange={(event) => validarClub(club.id, event.target.value)}
                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Activo">Activo</option>
                        <option value="Rechazado">Rechazado</option>
                        <option value="Inactivo">Inactivo (impago)</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
