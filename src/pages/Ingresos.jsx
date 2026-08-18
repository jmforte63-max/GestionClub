import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { apiUrl } from '../api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import '../styles/Transacciones.css';

export default function Ingresos({ selectedClub = 'all', selectedSeason = '', onSeasonChange, movimientoSeleccionado = null, onLimpiarMovimiento = null }) {
  const [ingresos, setIngresos] = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [mostrarContinuarIngreso, setMostrarContinuarIngreso] = useState(false);
  const [showConceptoModal, setShowConceptoModal] = useState(false);
  const [ingresoEditandoId, setIngresoEditandoId] = useState(null);
  const [conceptoEditandoId, setConceptoEditandoId] = useState(null);
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

  const [nuevoIngreso, setNuevoIngreso] = useState({
    fecha: '',
    concepto: '',
    monto: '',
    iva: '0',
    descripcion: '',
    cuenta_id: '',
    temporada: selectedSeason || obtenerTemporadaDesdeFecha(new Date().toISOString().slice(0, 10)),
  });
  const [mesSeleccionado, setMesSeleccionado] = useState('todos');
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: '', id: null });
  const [nuevoConcepto, setNuevoConcepto] = useState({
    nombre: '',
    descripcion: '',
    iva: '0',
    tieneImpuesto: false,
  });

  const cargarIngresos = async () => {
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
      const url = apiUrl(`/api/ingresos?${params.toString()}`);
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      setIngresos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar ingresos:', error);
      setIngresos([]);
    }
  };

  const cargarConceptos = async () => {
    try {
      const token = localStorage.getItem('token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const query = usuario?.rol === 'admin' && usuario?.email === 'admin@club.com' && selectedClub && selectedClub !== 'all'
        ? `?clubId=${encodeURIComponent(selectedClub)}`
        : '';

      const url = apiUrl(`/api/conceptos-ingresos${query}${query ? '&' : '?'}_=${Date.now()}`);
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      setConceptos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar conceptos:', error);
      setConceptos([]);
    }
  };

  const cargarCuentas = async () => {
    try {
      const token = localStorage.getItem('token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const params = usuario?.rol === 'admin' && usuario?.email === 'admin@club.com' && selectedClub && selectedClub !== 'all'
        ? `?clubId=${encodeURIComponent(selectedClub)}`
        : '';

      const response = await fetch(apiUrl(`/api/cuentas-bancarias${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCuentas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
      setCuentas([]);
    }
  };

  useEffect(() => {
    cargarIngresos();
    cargarConceptos();
    cargarCuentas();
  }, [selectedClub, selectedSeason]);

  useEffect(() => {
    const refrescarSiVuelveLaVista = () => {
      cargarIngresos();
      cargarConceptos();
    };

    window.addEventListener('focus', refrescarSiVuelveLaVista);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refrescarSiVuelveLaVista();
      }
    });

    return () => {
      window.removeEventListener('focus', refrescarSiVuelveLaVista);
      document.removeEventListener('visibilitychange', refrescarSiVuelveLaVista);
    };
  }, []);

  const temporadasDisponiblesIngreso = () => {
    const anioActual = new Date().getFullYear();
    return [
      `${anioActual - 1}/${String(anioActual).slice(-2)}`,
      `${anioActual}/${String(anioActual + 1).slice(-2)}`,
      `${anioActual + 1}/${String(anioActual + 2).slice(-2)}`
    ];
  };

  const abrirModalIngreso = (ingreso = null) => {
    if (ingreso) {
      const ivaActual = ingreso.iva !== undefined && ingreso.iva !== null && ingreso.iva !== '' ? String(ingreso.iva) : String(obtenerIvaIngreso(ingreso));
      setIngresoEditandoId(ingreso.id);
      setNuevoIngreso({
        fecha: normalizarFecha(ingreso.fecha),
        concepto: ingreso.concepto || '',
        monto: String(ingreso.monto || ''),
        iva: ivaActual,
        descripcion: ingreso.descripcion || '',
        cuenta_id: ingreso.cuenta_id ? String(ingreso.cuenta_id) : (cuentas[0]?.id ? String(cuentas[0].id) : ''),
        temporada: ingreso.temporada || selectedSeason || obtenerTemporadaDesdeFecha(ingreso.fecha || new Date().toISOString().slice(0, 10))
      });
      setConceptoSeleccionado(ingreso.concepto || '');
    } else {
      const fechaActual = new Date().toISOString().slice(0, 10);
      setIngresoEditandoId(null);
      setNuevoIngreso({
        fecha: fechaActual,
        concepto: '',
        monto: '',
        iva: '0',
        descripcion: '',
        cuenta_id: cuentas[0]?.id ? String(cuentas[0].id) : '',
        temporada: obtenerTemporadaDesdeFecha(fechaActual)
      });
      setConceptoSeleccionado('');
    }
    setShowIngresoModal(true);
  };

  const guardarIngreso = async () => {
    if (!nuevoIngreso.fecha || !nuevoIngreso.concepto || !nuevoIngreso.monto || !nuevoIngreso.cuenta_id) return false;

    try {
      const token = localStorage.getItem('token');
      const montoBase = parseFloat(nuevoIngreso.monto);
      const conceptoSeleccionadoActual = conceptos.find((concepto) => concepto.nombre === nuevoIngreso.concepto);
      const ivaFinal = conceptoSeleccionadoActual
        ? Number(conceptoSeleccionadoActual.iva || 0)
        : Number(nuevoIngreso.iva || 0);
      const totalConIvaFinal = Number((montoBase * (1 + (ivaFinal / 100))).toFixed(2));

      const temporadaGuardada = nuevoIngreso.temporada || obtenerTemporadaDesdeFecha(nuevoIngreso.fecha);
      const payload = {
        fecha: normalizarFecha(nuevoIngreso.fecha),
        concepto: nuevoIngreso.concepto,
        monto: montoBase,
        iva: ivaFinal,
        total_con_iva: totalConIvaFinal,
        descripcion: nuevoIngreso.descripcion || 'Ingreso desde interfaz',
        temporada: temporadaGuardada,
        cuenta_id: Number(nuevoIngreso.cuenta_id)
      };

      const response = ingresoEditandoId
        ? await fetch(apiUrl(`/api/ingresos/${ingresoEditandoId}`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          })
        : await fetch(apiUrl('/api/ingresos'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || (ingresoEditandoId ? 'Error al editar ingreso' : 'Error al crear ingreso'));
      }

      const ingresoGuardado = {
        id: ingresoEditandoId ?? data.id,
        fecha: payload.fecha,
        concepto: payload.concepto,
        monto: payload.monto,
        iva: payload.iva,
        total_con_iva: payload.total_con_iva,
        descripcion: payload.descripcion,
        temporada: payload.temporada,
      };

      setIngresos((prev) => {
        if (ingresoEditandoId) {
          return prev.map((item) => item.id === ingresoEditandoId ? { ...item, ...ingresoGuardado } : item);
        }
        return [ingresoGuardado, ...prev];
      });

      if (onSeasonChange && temporadaGuardada && temporadaGuardada !== selectedSeason) {
        onSeasonChange(temporadaGuardada);
      }

      setIngresoEditandoId(null);
      setNuevoIngreso({ fecha: nuevoIngreso.fecha, concepto: '', monto: '', iva: '0', descripcion: '', cuenta_id: cuentas[0]?.id ? String(cuentas[0].id) : '', temporada: temporadaGuardada });
      setConceptoSeleccionado('');
      toast.success(ingresoEditandoId ? 'Ingreso editado correctamente' : 'Ingreso registrado correctamente');
      await cargarIngresos();
      return true;
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar el ingreso');
      return false;
    }
  };

  const agregarConcepto = async () => {
    if (!nuevoConcepto.nombre || nuevoConcepto.iva === '') return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/conceptos-ingresos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: nuevoConcepto.nombre,
          descripcion: nuevoConcepto.descripcion,
          iva: Number(nuevoConcepto.iva)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear concepto');
      }

      setNuevoConcepto({ nombre: '', descripcion: '', iva: '0', tieneImpuesto: false });
      toast.success('Concepto registrado correctamente');
      cargarConceptos();
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar el concepto');
    }
  };

  const editarConcepto = async () => {
    if (!conceptoEditandoId || !nuevoConcepto.nombre || nuevoConcepto.iva === '') return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/conceptos-ingresos/${conceptoEditandoId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: nuevoConcepto.nombre,
          descripcion: nuevoConcepto.descripcion,
          iva: Number(nuevoConcepto.iva)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al editar concepto');
      }

      setConceptoEditandoId(null);
      setNuevoConcepto({ nombre: '', descripcion: '', iva: '0', tieneImpuesto: false });
      setShowConceptoModal(false);
      toast.success('Concepto editado correctamente');
      cargarConceptos();
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo editar el concepto');
    }
  };

  const abrirModalConcepto = (concepto = null) => {
    if (concepto) {
      setConceptoEditandoId(concepto.id);
      setNuevoConcepto({
        nombre: concepto.nombre || '',
        descripcion: concepto.descripcion || '',
        iva: String(concepto.iva || '0'),
        tieneImpuesto: Number(concepto.iva || 0) > 0
      });
    } else {
      setConceptoEditandoId(null);
      setNuevoConcepto({ nombre: '', descripcion: '', iva: '0', tieneImpuesto: false });
    }
    setShowConceptoModal(true);
  };

  const eliminarIngreso = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(apiUrl(`/api/ingresos/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarIngresos();
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarConcepto = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl(`/api/conceptos-ingresos/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar concepto');
      }

      cargarConceptos();
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo eliminar el concepto');
    }
  };

  const obtenerMesKey = (fechaValor) => {
    if (!fechaValor) return null;

    const texto = String(fechaValor).trim();
    if (!texto) return null;

    const fechaIso = texto.includes('T') ? texto.split('T')[0] : texto;
    const partes = fechaIso.split('-');

    if (partes.length >= 2) {
      const year = partes[0];
      const month = String(Number(partes[1])).padStart(2, '0');
      return `${year}-${month}`;
    }

    const fecha = new Date(texto);
    if (Number.isNaN(fecha.getTime())) return null;

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const incluirEnTemporada = (fechaValor) => {
    if (!fechaValor || !selectedSeason) return true;

    const texto = String(fechaValor).trim();
    if (!texto) return true;

    const fecha = new Date(texto.includes('T') ? texto.split('T')[0] : texto);
    if (Number.isNaN(fecha.getTime())) return true;

    const match = String(selectedSeason).match(/^(\d{4})\/(\d{2})$/);
    if (!match) return true;

    const comienzo = Number(match[1]);
    const fin = Number(`20${match[2]}`);
    const anio = fecha.getFullYear();

    return anio >= comienzo && anio <= fin;
  };

  const obtenerIvaIngreso = (ingreso) => {
    const concepto = conceptos.find((item) => item.nombre?.trim().toLowerCase() === ingreso?.concepto?.trim().toLowerCase());
    const ivaGuardado = Number(ingreso?.iva);

    if (ivaGuardado > 0) return ivaGuardado;
    if (concepto) return Number(concepto.iva || 0);

    if (ingreso && ingreso.iva !== undefined && ingreso.iva !== null && ingreso.iva !== '') {
      return ivaGuardado;
    }

    return Number(concepto?.iva || 0);
  };

  const datosTemporada = ingresos.filter((ingreso) => incluirEnTemporada(ingreso.fecha || ingreso.fecha_creacion));
  const nombreCuentaPorId = Object.fromEntries(cuentas.map((cuenta) => [String(cuenta.id), cuenta.nombre || 'Cuenta sin nombre']));

  const mesesDisponibles = Array.from(new Set(
    datosTemporada
      .map((ingreso) => obtenerMesKey(ingreso.fecha || ingreso.fecha_creacion))
      .filter(Boolean)
  )).sort().reverse();

  const ingresosFiltrados = mesSeleccionado === 'todos'
    ? datosTemporada
    : datosTemporada.filter((ingreso) => obtenerMesKey(ingreso.fecha || ingreso.fecha_creacion) === mesSeleccionado);

  const totalIngresos = ingresosFiltrados.reduce((sum, i) => {
    return sum + Number(i.monto || 0) * (1 + Number(obtenerIvaIngreso(i) || 0) / 100);
  }, 0);
  const ingresosParaMostrar = movimientoSeleccionado?.tipo === 'ingreso'
    ? ingresosFiltrados.filter((ingreso) => Number(ingreso.id) === Number(movimientoSeleccionado.id))
    : ingresosFiltrados;

  const normalizarFecha = (valor) => {
    if (!valor) return '';

    const valorTexto = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(valorTexto)) {
      return valorTexto;
    }

    const fecha = new Date(valorTexto);
    if (!Number.isNaN(fecha.getTime())) {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return valorTexto.slice(0, 10);
  };

  const obtenerTotalConImpuesto = (monto, iva, totalGuardado = null) => {
    return Number(monto || 0) * (1 + Number(iva || 0) / 100);
  };
  const conceptoActual = conceptos.find((item) => item.nombre === (conceptoSeleccionado || nuevoIngreso.concepto)) || null;
  const ivaActual = conceptoActual ? Number(conceptoActual.iva || 0) : Number(nuevoIngreso.iva || 0);
  const totalConImpuestoActual = obtenerTotalConImpuesto(nuevoIngreso.monto, ivaActual);

  useEffect(() => {
    if (movimientoSeleccionado?.tipo !== 'ingreso') return;
    document.getElementById(`movimiento-ingreso-${movimientoSeleccionado.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [movimientoSeleccionado, ingresosFiltrados.length]);

  return (
    <div className="transacciones-container">
      <h1>💰 Ingresos</h1>

      <div className="total-section">
        <h2>Total de Ingresos: €{totalIngresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
      </div>

      <div className="action-bar">
        <button className="primary-btn" onClick={() => abrirModalIngreso()}>+ Nuevo ingreso</button>
        <button className="secondary-btn" onClick={() => setShowConceptoModal(true)}>+ Nuevo concepto</button>
      </div>
      <ConfirmDeleteModal
        open={confirmDelete.open}
        title={confirmDelete.type === 'ingreso' ? 'Eliminar ingreso' : 'Eliminar concepto'}
        message={confirmDelete.type === 'ingreso'
          ? '¿Seguro que quieres eliminar este ingreso? Esta acción no se puede deshacer.'
          : '¿Seguro que quieres eliminar este concepto de ingreso?'}
        onCancel={() => setConfirmDelete({ open: false, type: '', id: null })}
        onConfirm={async () => {
          if (confirmDelete.type === 'ingreso') {
            await eliminarIngreso(confirmDelete.id);
          } else if (confirmDelete.type === 'concepto') {
            await eliminarConcepto(confirmDelete.id);
          }
          setConfirmDelete({ open: false, type: '', id: null });
        }}
      />

      <div className="form-section">
        <h2>Conceptos de ingresos</h2>
        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>IVA</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conceptos.length === 0 ? (
                <tr>
                  <td colSpan="3">No hay conceptos de ingresos registrados.</td>
                </tr>
              ) : (
                conceptos.map((concepto) => (
                  <tr key={concepto.id}>
                    <td>{concepto.nombre}</td>
                    <td>{Number(concepto.iva || 0).toFixed(2)}%</td>
                    <td>
                      <div className="inline-actions">
                        <button className="edit-btn" onClick={() => abrirModalConcepto(concepto)}>Editar</button>
                        <button className="delete-btn" onClick={() => setConfirmDelete({ open: true, type: 'concepto', id: concepto.id })}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showIngresoModal && (
        <div className="modal-overlay" onClick={() => setShowIngresoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header modal-header-inline">
              <h2>{ingresoEditandoId ? 'Editar Ingreso' : 'Registrar Nuevo Ingreso'}</h2>
              <label className="season-inline-field">
                <span>Temporada</span>
                <select
                  value={nuevoIngreso.temporada || obtenerTemporadaDesdeFecha(nuevoIngreso.fecha || new Date().toISOString().slice(0, 10))}
                  onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, temporada: e.target.value })}
                >
                  {temporadasDisponiblesIngreso().map((temporada) => (
                    <option key={temporada} value={temporada}>
                      {temporada}
                    </option>
                  ))}
                </select>
              </label>
              <button className="close-btn" onClick={() => {
                setIngresoEditandoId(null);
                setShowIngresoModal(false);
              }}>×</button>
            </div>
                  <div className="form-group modal-form">
              <input
                type="date"
                value={nuevoIngreso.fecha}
                onChange={(e) => setNuevoIngreso({
                  ...nuevoIngreso,
                  fecha: e.target.value,
                  temporada: obtenerTemporadaDesdeFecha(e.target.value)
                })}
              />

              {conceptos.length > 0 ? (
                <select
                  value={conceptoSeleccionado || nuevoIngreso.concepto}
                  onChange={(e) => {
                    const valor = e.target.value;
                    const conceptoSeleccionadoActual = conceptos.find((concepto) => concepto.nombre === valor);
                    setConceptoSeleccionado(valor);
                    setNuevoIngreso({
                      ...nuevoIngreso,
                      concepto: valor,
                      iva: conceptoSeleccionadoActual ? String(conceptoSeleccionadoActual.iva || 0) : '0'
                    });
                  }}
                >
                  <option value="">Selecciona un concepto</option>
                  {conceptos.map((concepto) => (
                    <option key={concepto.id} value={concepto.nombre}>{concepto.nombre}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Concepto"
                  value={nuevoIngreso.concepto}
                  onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, concepto: e.target.value })}
                />
              )}

              <input
                type="number"
                placeholder="Monto"
                value={nuevoIngreso.monto}
                onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, monto: e.target.value })}
              />

              <label>
                <span>Cuenta asociada</span>
                <select
                  value={nuevoIngreso.cuenta_id}
                  onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, cuenta_id: e.target.value })}
                >
                  <option value="">Selecciona una cuenta</option>
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Descripción</span>
                <input
                  type="text"
                  placeholder="Añade una descripción"
                  value={nuevoIngreso.descripcion}
                  onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, descripcion: e.target.value })}
                />
              </label>

              {(conceptoActual || nuevoIngreso.monto) && (
                <>
                  <div className="tax-badge">
                    {ivaActual > 0 ? `IVA: ${ivaActual.toFixed(2)}%` : 'Sin impuesto'}
                  </div>
                  <label>
                    <span>Monto + impuesto</span>
                    <input
                      type="text"
                      value={totalConImpuestoActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      readOnly
                    />
                  </label>
                </>
              )}

              <button onClick={async () => {
                const ok = await guardarIngreso();
                if (ok !== false) {
                  setIngresoEditandoId(null);
                  setMostrarContinuarIngreso(true);
                }
              }}>{ingresoEditandoId ? 'Guardar cambios' : 'Registrar Ingreso'}</button>
            </div>
          </div>
        </div>
      )}

      {mostrarContinuarIngreso && (
        <div className="modal-overlay follow-up-overlay">
          <div className="follow-up-modal" role="dialog" aria-modal="true" aria-labelledby="follow-up-ingreso-title">
            <div className="follow-up-icon">✓</div>
            <h2 id="follow-up-ingreso-title">Ingreso guardado</h2>
            <p>El movimiento se ha registrado correctamente.</p>
            <strong>¿Quieres ingresar otro movimiento?</strong>
            <div className="follow-up-actions">
              <button className="primary-btn" onClick={() => setMostrarContinuarIngreso(false)}>Sí, registrar otro</button>
              <button className="secondary-btn" onClick={() => { setMostrarContinuarIngreso(false); setShowIngresoModal(false); }}>No, cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showConceptoModal && (
        <div className="modal-overlay" onClick={() => setShowConceptoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{conceptoEditandoId ? 'Editar Concepto' : 'Nuevo Concepto'}</h2>
              <button className="close-btn" onClick={() => setShowConceptoModal(false)}>×</button>
            </div>
            <div className="form-group modal-form">
              <label>
                <span>Nombre del concepto</span>
                <input
                  type="text"
                  placeholder="Ej: Venta de abonados"
                  value={nuevoConcepto.nombre}
                  onChange={(e) => setNuevoConcepto({ ...nuevoConcepto, nombre: e.target.value })}
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={nuevoConcepto.tieneImpuesto}
                  onChange={(e) => {
                    const tieneImpuesto = e.target.checked;
                    setNuevoConcepto({
                      ...nuevoConcepto,
                      tieneImpuesto,
                      iva: tieneImpuesto ? nuevoConcepto.iva || '0' : '0'
                    });
                  }}
                />
                <span>¿Tiene impuesto?</span>
              </label>

              {nuevoConcepto.tieneImpuesto && (
                <label>
                  <span>Impuesto (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={nuevoConcepto.iva}
                    onChange={(e) => setNuevoConcepto({ ...nuevoConcepto, iva: e.target.value })}
                  />
                </label>
              )}

              <label>
                <span>Descripción</span>
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={nuevoConcepto.descripcion}
                  onChange={(e) => setNuevoConcepto({ ...nuevoConcepto, descripcion: e.target.value })}
                />
              </label>

              <button onClick={() => {
                if (conceptoEditandoId) {
                  editarConcepto();
                } else {
                  agregarConcepto();
                  setShowConceptoModal(false);
                }
              }}>
                {conceptoEditandoId ? 'Guardar cambios' : 'Guardar concepto'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-section">
        <h2>Listado de ingresos</h2>
        <div className="transactions-table">
          <div className="listing-header">
            {movimientoSeleccionado?.tipo === 'ingreso' && (
              <button className="secondary-btn restore-movements-btn" onClick={onLimpiarMovimiento}>
                Ver todos los movimientos
              </button>
            )}
            <select
              className="month-filter"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            >
              <option value="todos">Todos los meses</option>
              {mesesDisponibles.map((mes) => (
                <option key={mes} value={mes}>
                  {new Date(`${mes}-01T00:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Cuenta</th>
                <th>Descripción</th>
                <th>Temporada</th>
                <th>Monto</th>
                <th>Impuesto</th>
                <th>Total + IVA</th>
                <th>Acciones</th>
              </tr>
            </thead>
          <tbody>
            {ingresosParaMostrar.map(ingreso => {
              const iva = obtenerIvaIngreso(ingreso);
              const totalConImpuesto = obtenerTotalConImpuesto(ingreso.monto, iva, ingreso.total_con_iva);
              const temporadaActual = ingreso.temporada || obtenerTemporadaDesdeFecha(ingreso.fecha || ingreso.fecha_creacion || new Date().toISOString().slice(0, 10));
              const nombreCuenta = nombreCuentaPorId[String(ingreso.cuenta_id)] || 'Sin cuenta';

              return (
                <tr
                  key={ingreso.id}
                  id={`movimiento-ingreso-${ingreso.id}`}
                  className={movimientoSeleccionado?.tipo === 'ingreso' && Number(movimientoSeleccionado.id) === Number(ingreso.id) ? 'movement-target' : ''}
                >
                  <td>{normalizarFecha(ingreso.fecha || ingreso.fecha_creacion)}</td>
                  <td>{ingreso.concepto}</td>
                  <td>{nombreCuenta}</td>
                  <td>{ingreso.descripcion || '-'}</td>
                  <td>{temporadaActual}</td>
                  <td className="amount">€{Number(ingreso.monto || 0).toLocaleString()}</td>
                  <td>{iva > 0 ? `${iva.toFixed(2)}%` : '0.00%'}</td>
                  <td className="amount">€{totalConImpuesto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>
                    <div className="inline-actions">
                      <button className="edit-btn" onClick={() => abrirModalIngreso(ingreso)}>Editar</button>
                      <button className="delete-btn" onClick={() => setConfirmDelete({ open: true, type: 'ingreso', id: ingreso.id })}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
