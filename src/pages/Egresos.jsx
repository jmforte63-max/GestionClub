import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import '../styles/Transacciones.css';

export default function Egresos({ selectedClub = 'all', selectedSeason = '', onSeasonChange, movimientoSeleccionado = null, onLimpiarMovimiento = null, soloTraspasos = false }) {
  const [egresos, setEgresos] = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [mostrarContinuarEgreso, setMostrarContinuarEgreso] = useState(false);
  const [showConceptoModal, setShowConceptoModal] = useState(false);
  const [egresoEditandoId, setEgresoEditandoId] = useState(null);
  const [conceptoEditandoId, setConceptoEditandoId] = useState(null);
  const [gastoError, setGastoError] = useState('');
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

  const [nuevoEgreso, setNuevoEgreso] = useState({
    fecha: '',
    concepto: '',
    monto: '',
    categoria: '',
    descripcion: '',
    iva: '0',
    cuenta_id: '',
    cuenta_destino_id: '',
    es_traspaso: false,
    temporada: selectedSeason || obtenerTemporadaDesdeFecha(new Date().toISOString().slice(0, 10)),
  });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: '', id: null });
  const [nuevoConcepto, setNuevoConcepto] = useState({
    nombre: '',
    descripcion: '',
    iva: '0',
    tieneImpuesto: false,
  });
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState('todos');

  const temporadasDisponiblesEgreso = () => {
    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const temporadaBase = fechaActual.getMonth() >= 6 ? anioActual : anioActual - 1;

    return [
      `${temporadaBase - 1}/${String(temporadaBase).slice(-2)}`,
      `${temporadaBase}/${String(temporadaBase + 1).slice(-2)}`,
      `${temporadaBase + 1}/${String(temporadaBase + 2).slice(-2)}`
    ];
  };

  const categorias = ['Arbitraje', 'Equipamiento', 'Instalaciones', 'Transporte', 'Ferretería', 'Ferreteria', 'Otros'];

  const normalizarCategoriaTexto = (valor) => {
    const texto = String(valor || '').trim();
    if (!texto) return 'Otros';
    const limpio = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const coincide = categorias.find((categoria) => {
      const categoriaLimpia = categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return categoriaLimpia === limpio;
    });
    return coincide || texto;
  };

  const obtenerCategoriaInferida = (valor) => {
    return normalizarCategoriaTexto(valor);
  };

  const cargarEgresos = async () => {
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
      const url = `http://localhost:5000/api/egresos?${params.toString()}`;
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setEgresos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar egresos:', error);
      setEgresos([]);
    }
  };

  const cargarConceptos = async () => {
    try {
      const token = localStorage.getItem('token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const query = usuario?.rol === 'admin' && usuario?.email === 'admin@club.com' && selectedClub && selectedClub !== 'all'
        ? `?clubId=${encodeURIComponent(selectedClub)}`
        : '';

      const url = `http://localhost:5000/api/conceptos-egresos${query}${query ? '&' : '?'}_=${Date.now()}`;
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setConceptos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar conceptos de egresos:', error);
      setConceptos([]);
    }
  };

  const cargarCuentas = async () => {
    try {
      const token = localStorage.getItem('token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const query = usuario?.rol === 'admin' && usuario?.email === 'admin@club.com' && selectedClub && selectedClub !== 'all'
        ? `?clubId=${encodeURIComponent(selectedClub)}`
        : '';

      const response = await fetch(`http://localhost:5000/api/cuentas-bancarias${query}`, {
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
    cargarEgresos();
    cargarConceptos();
    cargarCuentas();
  }, [selectedClub, selectedSeason]);

  useEffect(() => {
    const refrescarSiVuelveLaVista = () => {
      cargarEgresos();
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

  const abrirModalEgreso = (egreso = null) => {
    setGastoError('');

    if (egreso) {
      const esTraspaso = Boolean(egreso.es_traspaso || (egreso.cuenta_destino_id && Number(egreso.cuenta_destino_id) !== Number(egreso.cuenta_origen_id ?? egreso.cuenta_id)));
      const ivaActual = egreso.iva !== undefined && egreso.iva !== null && egreso.iva !== '' ? String(egreso.iva) : '0';
      setEgresoEditandoId(egreso.id);
      setNuevoEgreso({
        fecha: normalizarFecha(egreso.fecha || ''),
        concepto: esTraspaso ? 'Traspaso' : (egreso.concepto || ''),
        monto: String(egreso.monto || ''),
        categoria: esTraspaso ? 'Traspaso' : (egreso.categoria || 'Otros'),
        descripcion: egreso.descripcion || '',
        iva: ivaActual,
        cuenta_id: egreso.cuenta_origen_id ? String(egreso.cuenta_origen_id) : (egreso.cuenta_id ? String(egreso.cuenta_id) : (cuentas[0]?.id ? String(cuentas[0].id) : '')),
        cuenta_destino_id: egreso.cuenta_destino_id ? String(egreso.cuenta_destino_id) : '',
        es_traspaso: esTraspaso,
        temporada: egreso.temporada || selectedSeason || obtenerTemporadaDesdeFecha(egreso.fecha || new Date().toISOString().slice(0, 10)),
      });
      setConceptoSeleccionado(esTraspaso ? 'Traspaso' : (egreso.concepto || ''));
    } else {
      const fechaActual = new Date().toISOString().slice(0, 10);
      setEgresoEditandoId(null);
      setNuevoEgreso({
        fecha: fechaActual,
        concepto: soloTraspasos ? 'Traspaso' : '',
        monto: '',
        categoria: soloTraspasos ? 'Traspaso' : 'Otros',
        descripcion: '',
        iva: '0',
        cuenta_id: cuentas[0]?.id ? String(cuentas[0].id) : '',
        cuenta_destino_id: soloTraspasos ? (cuentas.find((cuenta) => Number(cuenta.id) !== Number(cuentas[0]?.id || 0))?.id ? String(cuentas.find((cuenta) => Number(cuenta.id) !== Number(cuentas[0]?.id || 0)).id) : '') : '',
        es_traspaso: soloTraspasos,
        temporada: obtenerTemporadaDesdeFecha(fechaActual),
      });
      setConceptoSeleccionado(soloTraspasos ? 'Traspaso' : '');
    }
    setShowEgresoModal(true);
  };

  const obtenerIvaEgreso = (egreso) => {
    const concepto = conceptos.find((item) => item.nombre?.trim().toLowerCase() === egreso?.concepto?.trim().toLowerCase());
    const ivaGuardado = Number(egreso?.iva);

    if (ivaGuardado > 0) return ivaGuardado;
    if (concepto) return Number(concepto.iva || 0);

    if (egreso && egreso.iva !== undefined && egreso.iva !== null && egreso.iva !== '') {
      return ivaGuardado;
    }

    return Number(concepto?.iva || 0);
  };

  const obtenerTotalConImpuesto = (monto, iva) => Number(monto || 0) * (1 + Number(iva || 0) / 100);

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

  const agregarEgreso = async () => {
    const esTraspasoEnCurso = Boolean(nuevoEgreso.es_traspaso || soloTraspasos);
    const categoriaFinal = normalizarCategoriaTexto(nuevoEgreso.categoria || nuevoEgreso.concepto || (esTraspasoEnCurso ? 'Traspaso' : 'Otros'));
    const conceptoFinal = esTraspasoEnCurso ? (nuevoEgreso.concepto || 'Traspaso') : nuevoEgreso.concepto;

    if (!nuevoEgreso.fecha || !nuevoEgreso.monto || !nuevoEgreso.cuenta_id || (!esTraspasoEnCurso && !nuevoEgreso.concepto) || (esTraspasoEnCurso && !nuevoEgreso.cuenta_destino_id)) {
      setGastoError(esTraspasoEnCurso
        ? 'Completa la fecha, la cuenta de origen, la cuenta de destino y el monto antes de guardar el traspaso.'
        : 'Completa todos los campos obligatorios antes de guardar el gasto.');
      return;
    }

    if (esTraspasoEnCurso && (!nuevoEgreso.cuenta_destino_id || Number(nuevoEgreso.cuenta_destino_id) === Number(nuevoEgreso.cuenta_id))) {
      const mensaje = 'Para un traspaso debes elegir una cuenta de destino distinta a la cuenta de origen.';
      setGastoError(mensaje);
      toast.error(mensaje);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const montoBase = parseFloat(nuevoEgreso.monto);
      const conceptoSeleccionadoActual = conceptos.find((concepto) => concepto.nombre === nuevoEgreso.concepto);
      const ivaFinal = esTraspasoEnCurso ? Number(nuevoEgreso.iva || 0) : (conceptoSeleccionadoActual ? Number(conceptoSeleccionadoActual.iva || 0) : Number(nuevoEgreso.iva || 0));
      const totalFinal = Number((montoBase * (1 + (ivaFinal / 100))).toFixed(2));
      const cuentaSeleccionada = cuentas.find((cuenta) => Number(cuenta.id) === Number(nuevoEgreso.cuenta_id));
      const saldoDisponible = Number(cuentaSeleccionada?.saldo ?? 0);

      if (!esTraspasoEnCurso && saldoDisponible < totalFinal) {
        const mensaje = 'No se puede registrar este gasto: la cuenta quedaría en negativo. Revisa el saldo disponible antes de continuar.';
        setGastoError(mensaje);
        toast.error(mensaje);
        return;
      }

      const temporadaGuardada = nuevoEgreso.temporada || obtenerTemporadaDesdeFecha(nuevoEgreso.fecha);
      const response = await fetch(egresoEditandoId ? `http://localhost:5000/api/egresos/${egresoEditandoId}` : 'http://localhost:5000/api/egresos', {
        method: egresoEditandoId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fecha: normalizarFecha(nuevoEgreso.fecha),
          concepto: conceptoFinal,
          monto: montoBase,
          categoria: categoriaFinal,
          descripcion: nuevoEgreso.descripcion || (esTraspasoEnCurso ? 'Traspaso desde interfaz' : 'Egreso desde interfaz'),
          iva: ivaFinal,
          total_con_iva: totalFinal,
          temporada: temporadaGuardada,
          cuenta_id: Number(nuevoEgreso.cuenta_id),
          cuenta_destino_id: esTraspasoEnCurso ? Number(nuevoEgreso.cuenta_destino_id) : null,
          es_traspaso: esTraspasoEnCurso
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const mensaje = data.error || 'No se pudo guardar el gasto';
        setGastoError(mensaje);
        toast.error(mensaje);
        throw new Error(mensaje);
      }

      const egresoGuardado = {
        id: egresoEditandoId ?? data.id,
        fecha: nuevoEgreso.fecha,
        concepto: nuevoEgreso.concepto,
        monto: montoBase,
        categoria: categoriaFinal,
        descripcion: nuevoEgreso.descripcion || 'Egreso desde interfaz',
        iva: ivaFinal,
        total_con_iva: totalFinal,
        temporada: temporadaGuardada,
      };

      setEgresos((prev) => {
        if (egresoEditandoId) {
          return prev.map((item) => item.id === egresoEditandoId ? { ...item, ...egresoGuardado } : item);
        }
        return [egresoGuardado, ...prev];
      });

      if (onSeasonChange && temporadaGuardada && temporadaGuardada !== selectedSeason) {
        onSeasonChange(temporadaGuardada);
      }

      setGastoError('');
      setEgresoEditandoId(null);
      setNuevoEgreso({ fecha: nuevoEgreso.fecha, concepto: '', monto: '', categoria: 'Otros', descripcion: '', iva: '0', cuenta_id: cuentas[0]?.id ? String(cuentas[0].id) : '', cuenta_destino_id: '', es_traspaso: false, temporada: temporadaGuardada });
      setConceptoSeleccionado('');
      const mensajeToast = esTraspasoEnCurso
        ? (egresoEditandoId ? 'Traspaso editado correctamente' : 'Traspaso registrado correctamente')
        : (egresoEditandoId ? 'Gasto editado correctamente' : 'Gasto registrado correctamente');
      toast.success(mensajeToast);
      cargarEgresos();
      return true;
    } catch (error) {
      console.error(error);
      if (!gastoError) {
        alert(error.message || 'No se pudo guardar el gasto');
      }
    }
  };

  const agregarConcepto = async () => {
    if (!nuevoConcepto.nombre || nuevoConcepto.iva === '') return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/conceptos-egresos', {
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
      if (!response.ok) throw new Error(data.error || 'Error al crear concepto');

      setNuevoConcepto({ nombre: '', descripcion: '', iva: '0', tieneImpuesto: false });
      setShowConceptoModal(false);
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
      const response = await fetch(`http://localhost:5000/api/conceptos-egresos/${conceptoEditandoId}`, {
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
      if (!response.ok) throw new Error(data.error || 'Error al editar concepto');

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
        tieneImpuesto: Number(concepto.iva || 0) > 0,
      });
    } else {
      setConceptoEditandoId(null);
      setNuevoConcepto({ nombre: '', descripcion: '', iva: '0', tieneImpuesto: false });
    }
    setShowConceptoModal(true);
  };

  const eliminarConcepto = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/conceptos-egresos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Error al eliminar concepto');
      cargarConceptos();
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo eliminar el concepto');
    }
  };

  const eliminarEgreso = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/egresos/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Error al eliminar gasto');

      await cargarEgresos();
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo eliminar el gasto');
    }
  };

  const esTraspasoEgreso = (egreso) => Boolean(
    egreso?.es_traspaso ||
    (egreso?.cuenta_destino_id && Number(egreso.cuenta_destino_id) !== Number(egreso.cuenta_origen_id ?? egreso.cuenta_id))
  );

  const getTotalEgresoValor = (egreso) => {
    return obtenerTotalConImpuesto(egreso?.monto, obtenerIvaEgreso(egreso));
  };

  const conceptoActual = conceptos.find((item) => item.nombre === (conceptoSeleccionado || nuevoEgreso.concepto)) || null;
  const ivaActual = conceptoActual ? Number(conceptoActual.iva || 0) : Number(nuevoEgreso.iva || 0);
  const totalConImpuestoActual = obtenerTotalConImpuesto(nuevoEgreso.monto, ivaActual);
  const cuentaOrigenSeleccionada = cuentas.find((cuenta) => Number(cuenta.id) === Number(nuevoEgreso.cuenta_id)) || null;
  const cuentaDestinoSeleccionada = cuentas.find((cuenta) => Number(cuenta.id) === Number(nuevoEgreso.cuenta_destino_id)) || null;
  const saldoOrigenSeleccionado = Number(cuentaOrigenSeleccionada?.saldo ?? 0);
  const saldoDestinoSeleccionado = Number(cuentaDestinoSeleccionada?.saldo ?? 0);
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

  const egresosDeTemporada = egresos.filter((egreso) => incluirEnTemporada(egreso.fecha || egreso.fecha_creacion));
  const nombreCuentaPorId = Object.fromEntries(cuentas.map((cuenta) => [String(cuenta.id), cuenta.nombre || 'Cuenta sin nombre']));
  
  const mesesDisponibles = Array.from(new Set(
    egresosDeTemporada
      .map((egreso) => obtenerMesKey(egreso.fecha || egreso.fecha_creacion))
      .filter(Boolean)
  )).sort().reverse();

  const egresosFiltrados = mesSeleccionado === 'todos'
    ? egresosDeTemporada
    : egresosDeTemporada.filter((egreso) => obtenerMesKey(egreso.fecha || egreso.fecha_creacion) === mesSeleccionado);

  const gastosFiltrados = egresosFiltrados.filter((egreso) => !esTraspasoEgreso(egreso));
  const traspasosFiltrados = egresosFiltrados.filter((egreso) => esTraspasoEgreso(egreso));
  const totalGastos = gastosFiltrados.reduce((sum, e) => sum + getTotalEgresoValor(e), 0);
  const totalTraspasos = traspasosFiltrados.reduce((sum, e) => sum + Number(e.monto || 0), 0);
  const egresosParaMostrar = movimientoSeleccionado?.tipo === 'egreso'
    ? gastosFiltrados.filter((egreso) => Number(egreso.id) === Number(movimientoSeleccionado.id))
    : gastosFiltrados;
  const traspasosParaMostrar = movimientoSeleccionado?.tipo === 'traspaso'
    ? traspasosFiltrados.filter((egreso) => Number(egreso.id) === Number(movimientoSeleccionado.id))
    : traspasosFiltrados;

  useEffect(() => {
    if (movimientoSeleccionado?.tipo === 'egreso') {
      document.getElementById(`movimiento-egreso-${movimientoSeleccionado.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (movimientoSeleccionado?.tipo === 'traspaso') {
      document.getElementById(`movimiento-traspaso-${movimientoSeleccionado.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [movimientoSeleccionado, egresosFiltrados.length, traspasosFiltrados.length]);

  const esModoTraspasoActual = Boolean(nuevoEgreso.es_traspaso || soloTraspasos);

  return (
    <div className="transacciones-container">
      <h1>{soloTraspasos ? '📋 Traspasos' : '📋 Gastos'}</h1>

      <div className="total-section">
        {soloTraspasos ? (
          <h2>Total de Traspasos: €{totalTraspasos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
        ) : (
          <h2>Total de Gastos: €{totalGastos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
        )}
      </div>

      <div className="action-bar">
        <button className="primary-btn" onClick={() => {
          if (soloTraspasos) {
            setNuevoEgreso((prev) => ({ ...prev, es_traspaso: true, cuenta_destino_id: prev.cuenta_destino_id || '', cuenta_id: prev.cuenta_id || (cuentas[0]?.id ? String(cuentas[0].id) : '') }));
          }
          abrirModalEgreso();
        }}>{soloTraspasos ? '+ Nuevo traspaso' : '+ Nuevo gasto'}</button>
        {!soloTraspasos && (
          <button className="secondary-btn" onClick={() => setShowConceptoModal(true)}>+ Nuevo concepto</button>
        )}
      </div>

      <ConfirmDeleteModal
        open={confirmDelete.open}
        title={confirmDelete.type === 'concepto' ? 'Eliminar concepto' : confirmDelete.type === 'traspaso' ? 'Eliminar traspaso' : 'Eliminar gasto'}
        message={confirmDelete.type === 'concepto'
          ? '¿Seguro que quieres eliminar este concepto de gasto?'
          : confirmDelete.type === 'traspaso'
            ? '¿Seguro que quieres eliminar este traspaso? Esta acción no se puede deshacer.'
            : '¿Seguro que quieres eliminar este gasto? Esta acción no se puede deshacer.'}
        onCancel={() => setConfirmDelete({ open: false, type: '', id: null })}
        onConfirm={async () => {
          if (confirmDelete.type === 'egreso' || confirmDelete.type === 'traspaso') {
            await eliminarEgreso(confirmDelete.id);
          } else if (confirmDelete.type === 'concepto') {
            await eliminarConcepto(confirmDelete.id);
          }
          setConfirmDelete({ open: false, type: '', id: null });
        }}
      />

      {!soloTraspasos && (
        <div className="form-section">
          <h2>Conceptos de gastos</h2>
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
                    <td colSpan="3">No hay conceptos de gastos registrados.</td>
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
      )}

      {showEgresoModal && (
        <div className="modal-overlay" onClick={() => setShowEgresoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header modal-header-inline">
              <h2>{egresoEditandoId ? (esModoTraspasoActual ? 'Editar Traspaso' : 'Editar Gasto') : (esModoTraspasoActual ? 'Registrar Nuevo Traspaso' : 'Registrar Nuevo Gasto')}</h2>
              <label className="season-inline-field">
                <span>Temporada</span>
                <select
                  value={nuevoEgreso.temporada || obtenerTemporadaDesdeFecha(nuevoEgreso.fecha || new Date().toISOString().slice(0, 10))}
                  onChange={(e) => setNuevoEgreso({ ...nuevoEgreso, temporada: e.target.value })}
                >
                  {temporadasDisponiblesEgreso().map((temporada) => (
                    <option key={temporada} value={temporada}>{temporada}</option>
                  ))}
                </select>
              </label>
              <button className="close-btn" onClick={() => setShowEgresoModal(false)}>×</button>
            </div>
            <div className="form-group modal-form">
              <input
                type="date"
                value={nuevoEgreso.fecha}
                onChange={(e) => setNuevoEgreso({
                  ...nuevoEgreso,
                  fecha: e.target.value,
                  temporada: obtenerTemporadaDesdeFecha(e.target.value)
                })}
              />

              {!soloTraspasos && !nuevoEgreso.es_traspaso ? (
                conceptos.length > 0 ? (
                  <select
                    value={conceptoSeleccionado || nuevoEgreso.concepto}
                    onChange={(e) => {
                      const valor = e.target.value;
                      const conceptoSeleccionadoActual = conceptos.find((concepto) => concepto.nombre === valor);
                      const categoriaAutomatica = obtenerCategoriaInferida(valor);
                      setConceptoSeleccionado(valor);
                      setNuevoEgreso({
                        ...nuevoEgreso,
                        concepto: valor,
                        categoria: categoriaAutomatica === 'Otros' && nuevoEgreso.categoria && nuevoEgreso.categoria !== 'Otros'
                          ? nuevoEgreso.categoria
                          : categoriaAutomatica,
                        iva: conceptoSeleccionadoActual ? String(conceptoSeleccionadoActual.iva || 0) : '0',
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
                    value={nuevoEgreso.concepto}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setNuevoEgreso({
                        ...nuevoEgreso,
                        concepto: valor,
                        categoria: normalizarCategoriaTexto(valor)
                      });
                    }}
                  />
                )
              ) : (
                <input
                  type="text"
                  placeholder="Traspaso"
                  value={nuevoEgreso.concepto || 'Traspaso'}
                  readOnly
                />
              )}

              <input
                type="number"
                placeholder="Monto"
                value={nuevoEgreso.monto}
                onChange={(e) => setNuevoEgreso({ ...nuevoEgreso, monto: e.target.value })}
              />

              <label>
                <span>Cuenta de origen</span>
                <select
                  value={nuevoEgreso.cuenta_id}
                  onChange={(e) => setNuevoEgreso({ ...nuevoEgreso, cuenta_id: e.target.value, cuenta_destino_id: nuevoEgreso.es_traspaso && Number(e.target.value) === Number(nuevoEgreso.cuenta_destino_id) ? '' : nuevoEgreso.cuenta_destino_id })}
                >
                  <option value="">Selecciona una cuenta</option>
                  {cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</option>
                  ))}
                </select>
              </label>

              {nuevoEgreso.es_traspaso && (
                <label>
                  <span>Cuenta de destino</span>
                  <select
                    value={nuevoEgreso.cuenta_destino_id}
                    onChange={(e) => setNuevoEgreso({ ...nuevoEgreso, cuenta_destino_id: e.target.value })}
                  >
                    <option value="">Selecciona una cuenta</option>
                    {cuentas
                      .filter((cuenta) => Number(cuenta.id) !== Number(nuevoEgreso.cuenta_id))
                      .map((cuenta) => (
                        <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</option>
                      ))}
                  </select>
                </label>
              )}

              <div className="tax-badge">
                {nuevoEgreso.es_traspaso
                  ? `Origen: €${saldoOrigenSeleccionado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Destino: €${saldoDestinoSeleccionado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `Saldo disponible: €${saldoOrigenSeleccionado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>

              <label>
                <span>Descripción</span>
                <input
                  type="text"
                  placeholder="Añade una descripción"
                  value={nuevoEgreso.descripcion}
                  onChange={(e) => setNuevoEgreso({ ...nuevoEgreso, descripcion: e.target.value })}
                />
              </label>

              {(conceptoActual || nuevoEgreso.monto) && (
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

              {gastoError && (
                <div className="validation-alert validation-alert-error">
                  {gastoError}
                </div>
              )}

              <button onClick={async () => {
                const ok = await agregarEgreso();
                if (ok) {
                  setMostrarContinuarEgreso(true);
                }
              }}>{egresoEditandoId ? 'Guardar cambios' : (esModoTraspasoActual ? 'Registrar Traspaso' : 'Registrar Gasto')}</button>
            </div>
          </div>
        </div>
      )}

      {mostrarContinuarEgreso && (
        <div className="modal-overlay follow-up-overlay">
          <div className="follow-up-modal" role="dialog" aria-modal="true" aria-labelledby="follow-up-egreso-title">
            <div className="follow-up-icon">✓</div>
            <h2 id="follow-up-egreso-title">{esModoTraspasoActual ? 'Traspaso guardado' : 'Gasto guardado'}</h2>
            <p>{esModoTraspasoActual ? 'El traspaso se ha registrado correctamente.' : 'El movimiento se ha registrado correctamente.'}</p>
            <strong>{esModoTraspasoActual ? '¿Quieres ingresar otro traspaso?' : '¿Quieres ingresar otro movimiento?'}</strong>
            <div className="follow-up-actions">
              <button className="primary-btn" onClick={() => setMostrarContinuarEgreso(false)}>{esModoTraspasoActual ? 'Sí, registrar otro traspaso' : 'Sí, registrar otro'}</button>
              <button className="secondary-btn" onClick={() => { setMostrarContinuarEgreso(false); setShowEgresoModal(false); }}>No, cerrar</button>
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
                  placeholder="Ej: Arbitraje local"
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
                      iva: tieneImpuesto ? nuevoConcepto.iva || '0' : '0',
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
                }
              }}>
                {conceptoEditandoId ? 'Guardar cambios' : 'Guardar concepto'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-section">
        <div className="listing-header">
          {!soloTraspasos && movimientoSeleccionado?.tipo === 'egreso' && (
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

        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                {soloTraspasos ? (
                  <>
                    <th>Origen</th>
                    <th>Destino</th>
                  </>
                ) : (
                  <>
                    <th>Concepto</th>
                    <th>Cuenta</th>
                  </>
                )}
                <th>Temporada</th>
                <th>Monto</th>
                {!soloTraspasos && <th>Impuesto</th>}
                {!soloTraspasos && <th>Total + IVA</th>}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(soloTraspasos ? traspasosParaMostrar : egresosParaMostrar).length === 0 ? (
                <tr>
                  <td colSpan={soloTraspasos ? 6 : 8}>No hay {soloTraspasos ? 'traspasos' : 'gastos'} registrados.</td>
                </tr>
              ) : (soloTraspasos ? traspasosParaMostrar : egresosParaMostrar).map((item) => {
                if (soloTraspasos) {
                  const temporadaActual = item.temporada || obtenerTemporadaDesdeFecha(item.fecha || item.fecha_creacion || new Date().toISOString().slice(0, 10));
                  const cuentaOrigen = nombreCuentaPorId[String(item.cuenta_origen_id ?? item.cuenta_id)] || 'Sin cuenta';
                  const cuentaDestino = nombreCuentaPorId[String(item.cuenta_destino_id)] || 'Sin cuenta';

                  return (
                    <tr
                      key={item.id}
                      id={`movimiento-traspaso-${item.id}`}
                      className={movimientoSeleccionado?.tipo === 'traspaso' && Number(movimientoSeleccionado.id) === Number(item.id) ? 'movement-target' : ''}
                    >
                      <td>{normalizarFecha(item.fecha || item.fecha_creacion)}</td>
                      <td>{cuentaOrigen}</td>
                      <td>{cuentaDestino}</td>
                      <td>{temporadaActual}</td>
                      <td className="amount">€{Number(item.monto || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>
                        <div className="inline-actions">
                          <button className="edit-btn" onClick={() => abrirModalEgreso(item)}>Editar</button>
                          <button className="delete-btn" onClick={() => setConfirmDelete({ open: true, type: 'traspaso', id: item.id })}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const iva = obtenerIvaEgreso(item);
                const totalConImpuesto = obtenerTotalConImpuesto(item.monto, iva);
                const temporadaActual = item.temporada || obtenerTemporadaDesdeFecha(item.fecha || item.fecha_creacion || new Date().toISOString().slice(0, 10));
                const cuentaOrigen = nombreCuentaPorId[String(item.cuenta_origen_id ?? item.cuenta_id)] || 'Sin cuenta';

                return (
                  <tr
                    key={item.id}
                    id={`movimiento-egreso-${item.id}`}
                    className={movimientoSeleccionado?.tipo === 'egreso' && Number(movimientoSeleccionado.id) === Number(item.id) ? 'movement-target' : ''}
                  >
                    <td>{normalizarFecha(item.fecha || item.fecha_creacion)}</td>
                    <td>{item.concepto}</td>
                    <td>{cuentaOrigen}</td>
                    <td>{temporadaActual}</td>
                    <td className="amount">€{Number(item.monto || 0).toLocaleString()}</td>
                    <td>{iva > 0 ? `${iva.toFixed(2)}%` : '0.00%'}</td>
                    <td className="amount">€{totalConImpuesto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      <div className="inline-actions">
                        <button className="edit-btn" onClick={() => abrirModalEgreso(item)}>Editar</button>
                        <button className="delete-btn" onClick={() => setConfirmDelete({ open: true, type: 'egreso', id: item.id })}>Eliminar</button>
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
