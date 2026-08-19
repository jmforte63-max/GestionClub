import { useEffect, useState } from 'react';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function CuentasBancarias({ selectedClub = 'all' }) {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'Banco',
    banco: '',
    numero_cuenta: '',
    iban: '',
    saldo_inicial: '0',
    fecha_saldo_inicial: new Date().toISOString().slice(0, 10),
    activo: true,
  });

  const cargarCuentas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const clubParam = selectedClub && selectedClub !== 'all' ? `?clubId=${encodeURIComponent(selectedClub)}` : '';
      const response = await fetch(`http://localhost:5000/api/cuentas-bancarias${clubParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las cuentas bancarias');
      }

      setCuentas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar cuentas bancarias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCuentas();
  }, [selectedClub]);

  const normalizarTipoCuenta = (tipo) => {
    const valor = String(tipo ?? 'Banco').trim();
    const normalizado = valor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (normalizado.includes('tarjeta') || normalizado.includes('credito') || normalizado.includes('credit')) {
      return 'Tarjeta de crédito';
    }

    if (normalizado.includes('efectivo') || normalizado.includes('cash')) {
      return 'Efectivo';
    }

    return 'Banco';
  };

  const limpiarFormulario = () => {
    setForm({ nombre: '', tipo: 'Banco', banco: '', numero_cuenta: '', iban: '', saldo_inicial: '0', fecha_saldo_inicial: new Date().toISOString().slice(0, 10), activo: true });
    setEditandoId(null);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const guardarCuenta = async () => {
    const nombre = form.nombre.trim();
    const banco = form.banco.trim();
    const numeroCuenta = form.numero_cuenta.trim();

    if (!nombre || !banco || !numeroCuenta) {
      setError('Nombre, banco y número de cuenta son obligatorios.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        nombre,
        tipo: normalizarTipoCuenta(form.tipo),
        banco,
        numero_cuenta: numeroCuenta,
        iban: form.iban.trim(),
        saldo_inicial: Number(form.saldo_inicial || 0),
        fecha_saldo_inicial: form.fecha_saldo_inicial,
        activo: Boolean(form.activo),
      };
      const clubParam = selectedClub && selectedClub !== 'all' ? `?clubId=${encodeURIComponent(selectedClub)}` : '';
      const url = editandoId
        ? `http://localhost:5000/api/cuentas-bancarias/${editandoId}${clubParam}`
        : `http://localhost:5000/api/cuentas-bancarias${clubParam}`;

      const response = await fetch(url, {
        method: editandoId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar la cuenta bancaria');
      }

      setSuccess(editandoId ? 'Cuenta bancaria editada correctamente.' : 'Cuenta bancaria creada correctamente.');
      setError('');
      limpiarFormulario();
      cargarCuentas();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la cuenta bancaria.');
    }
  };

  const editarCuenta = (cuenta) => {
    setEditandoId(cuenta.id);
    setForm({
      nombre: cuenta.nombre || '',
      tipo: normalizarTipoCuenta(cuenta.tipo),
      banco: cuenta.banco || '',
      numero_cuenta: cuenta.numero_cuenta || '',
      iban: cuenta.iban || '',
      saldo_inicial: String(Number(cuenta.saldo_inicial ?? cuenta.saldo ?? 0).toFixed(2)),
      fecha_saldo_inicial: String(cuenta.fecha_saldo_inicial || cuenta.fecha_creacion || '').slice(0, 10),
      activo: Boolean(cuenta.activo),
    });
    setError('');
    setSuccess('');
  };

  const eliminarCuenta = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const clubParam = selectedClub && selectedClub !== 'all' ? `?clubId=${encodeURIComponent(selectedClub)}` : '';
      const response = await fetch(`http://localhost:5000/api/cuentas-bancarias/${id}${clubParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo eliminar la cuenta bancaria');
      }

      setSuccess('Cuenta bancaria eliminada correctamente.');
      setError('');
      cargarCuentas();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la cuenta bancaria.');
    }
  };

  const confirmarEliminarCuenta = (id) => {
    setConfirmDelete({ open: true, id });
  };

  return (
    <>
      <ConfirmDeleteModal
        open={confirmDelete.open}
        title="Eliminar cuenta"
        message="¿Seguro que quieres eliminar esta cuenta? Esta acción no se puede deshacer."
        onCancel={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={async () => {
          if (confirmDelete.id) {
            await eliminarCuenta(confirmDelete.id);
          }
          setConfirmDelete({ open: false, id: null });
        }}
      />

      <section className="card section-card account-form-panel">
        <div className="section-header">
          <h2>{editandoId ? 'Editar cuenta o tarjeta' : 'Nueva cuenta o tarjeta'}</h2>
        </div>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <div className="account-form-grid">
          <label className="account-field">
            <span>Nombre</span>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: Cuenta principal"
            />
          </label>

          <label className="account-field">
            <span>Tipo</span>
            <select name="tipo" value={form.tipo} onChange={handleChange}>
              <option value="Banco">Banco</option>
              <option value="Tarjeta de crédito">Tarjeta de crédito</option>
              <option value="Efectivo">Efectivo</option>
            </select>
          </label>

          <label className="account-field">
            <span>{form.tipo === 'Tarjeta de crédito' ? 'Entidad / marca' : form.tipo === 'Efectivo' ? 'Lugar / responsable' : 'Banco'}</span>
            <input
              type="text"
              name="banco"
              value={form.banco}
              onChange={handleChange}
              placeholder={form.tipo === 'Tarjeta de crédito' ? 'Ej: Visa, Mastercard' : form.tipo === 'Efectivo' ? 'Ej: Caja principal' : 'Ej: Santander'}
            />
          </label>

          <label className="account-field">
            <span>{form.tipo === 'Tarjeta de crédito' ? 'Número / identificador' : form.tipo === 'Efectivo' ? 'Referencia / detalle' : 'Número de cuenta'}</span>
            <input
              type="text"
              name="numero_cuenta"
              value={form.numero_cuenta}
              onChange={handleChange}
              placeholder={form.tipo === 'Tarjeta de crédito' ? 'Ej: **** 1234' : form.tipo === 'Efectivo' ? 'Ej: Caja 1' : 'Ej: 123456789'}
            />
          </label>

          <label className="account-field">
            <span>IBAN</span>
            <input
              type="text"
              name="iban"
              value={form.iban}
              onChange={handleChange}
              placeholder="Opcional"
            />
          </label>

          <label className="account-field">
            <span>Saldo inicial</span>
            <input
              type="number"
              step="0.01"
              name="saldo_inicial"
              value={form.saldo_inicial}
              onChange={handleChange}
            />
          </label>

          <label className="account-field">
            <span>Fecha del saldo inicial</span>
            <input
              type="date"
              name="fecha_saldo_inicial"
              value={form.fecha_saldo_inicial}
              onChange={handleChange}
            />
          </label>

          <label className="checkbox-row account-check">
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={handleChange}
            />
            <span>Cuenta activa</span>
          </label>
        </div>

        <div className="account-form-actions">
          <button className="primary-button" onClick={guardarCuenta}>
            {editandoId ? 'Guardar cambios' : 'Registrar cuenta'}
          </button>
          <button className="secondary-button" onClick={limpiarFormulario}>
            Limpiar
          </button>
        </div>
      </section>

      <section className="card section-card">
        <div className="section-header">
          <h2>Listado de cuentas y tarjetas</h2>
        </div>

        {loading ? (
          <p>Cargando cuentas...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Entidad</th>
                  <th>Número</th>
                  <th>IBAN</th>
                  <th>Saldo inicial</th>
                  <th>Saldo</th>
                  <th>Fecha saldo inicial</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.length === 0 ? (
                  <tr>
                    <td colSpan="9">No hay cuentas ni tarjetas registradas.</td>
                  </tr>
                ) : (
                  cuentas.map((cuenta) => (
                    <tr key={cuenta.id}>
                      <td>{cuenta.nombre}</td>
                      <td>{cuenta.banco}</td>
                      <td>{cuenta.numero_cuenta}</td>
                      <td>{cuenta.iban || '—'}</td>
                      <td>€{Number(cuenta.saldo_inicial ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>€{Number(cuenta.saldo || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{cuenta.fecha_saldo_inicial || cuenta.fecha_creacion?.slice?.(0, 10) || '—'}</td>
                      <td>{cuenta.activo ? 'Activa' : 'Inactiva'}</td>
                      <td>
                        <div className="inline-actions">
                          <button className="edit-btn" onClick={() => editarCuenta(cuenta)}>Editar</button>
                          <button className="delete-btn" onClick={() => confirmarEliminarCuenta(cuenta.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
