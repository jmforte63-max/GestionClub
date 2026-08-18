import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../api';
import '../styles/Reportes.css';
import {
  calcularIvaMovimiento,
  getPeriodoActual,
  getTrimestresDeTemporada,
  obtenerMesesDeTemporada,
  obtenerTemporadaDesdeFecha,
  obtenerTemporadasDisponibles,
} from './reportesLogic.js';

const formatearEuros = (valor) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(valor || 0));

export default function Reportes({ selectedClub = 'all', selectedSeason = '', temporadas = [], clubName = 'Club', clubEscudo = '', onSeasonChange = null, onNavigate = null }) {
  const MAX_MOVIMIENTOS_MOSTRADOS = 10;
  const formatearEuros = (valor) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(valor || 0));
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [conceptosIngresos, setConceptosIngresos] = useState([]);
  const [conceptosEgresos, setConceptosEgresos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState('01');

  const temporadaActiva = selectedSeason || obtenerTemporadaDesdeFecha(new Date().toISOString().slice(0, 10));
  const temporadasDisponibles = useMemo(() => {
    const nombres = temporadas.map((temporada) => temporada?.nombre).filter(Boolean);
    return nombres.length > 0 ? nombres : obtenerTemporadasDisponibles(temporadaActiva);
  }, [temporadas, temporadaActiva]);
  const trimestresDisponibles = useMemo(() => getTrimestresDeTemporada(temporadaActiva), [temporadaActiva]);

  useEffect(() => {
    const valoresValidos = trimestresDisponibles.map((trim) => trim.value);
    setTrimestreSeleccionado((prev) => (prev && valoresValidos.includes(prev) ? prev : '01'));
  }, [trimestresDisponibles]);

  useEffect(() => {
    const cargarMovimientos = async () => {
      try {
        setCargando(true);
        const token = localStorage.getItem('token');
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const paramsIngresos = new URLSearchParams();
        const paramsEgresos = new URLSearchParams();

        if (usuario?.rol === 'admin' && usuario?.email === 'admin@club.com' && selectedClub && selectedClub !== 'all') {
          paramsIngresos.set('clubId', String(selectedClub));
          paramsEgresos.set('clubId', String(selectedClub));
        }

        const [ingresosRes, egresosRes, conceptosIngresosRes, conceptosEgresosRes] = await Promise.all([
          fetch(apiUrl(`/api/ingresos?${paramsIngresos.toString()}`), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl(`/api/egresos?${paramsEgresos.toString()}`), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl('/api/conceptos-ingresos'), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl('/api/conceptos-egresos'), {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const ingresosData = await ingresosRes.json().catch(() => []);
        const egresosData = await egresosRes.json().catch(() => []);
        const conceptosIngresosData = await conceptosIngresosRes.json().catch(() => []);
        const conceptosEgresosData = await conceptosEgresosRes.json().catch(() => []);

        setIngresos(Array.isArray(ingresosData) ? ingresosData : []);
        setEgresos(Array.isArray(egresosData) ? egresosData : []);
        setConceptosIngresos(Array.isArray(conceptosIngresosData) ? conceptosIngresosData : []);
        setConceptosEgresos(Array.isArray(conceptosEgresosData) ? conceptosEgresosData : []);
      } catch (error) {
        console.error('Error al cargar movimientos para el IVA:', error);
        setIngresos([]);
        setEgresos([]);
        setConceptosIngresos([]);
        setConceptosEgresos([]);
      } finally {
        setCargando(false);
      }
    };

    cargarMovimientos();
  }, [selectedClub, temporadaActiva]);

  const mesesEnPeriodo = getPeriodoActual(trimestreSeleccionado, temporadaActiva);

  const obtenerIvaConcepto = (movimiento, conceptos) => {
    const concepto = conceptos.find((item) => item.nombre?.trim().toLowerCase() === movimiento?.concepto?.trim().toLowerCase());
    return Number(concepto?.iva || 0);
  };

  const tieneIva = (movimiento, conceptos) => calcularIvaMovimiento(movimiento, obtenerIvaConcepto(movimiento, conceptos)) > 0;

  const perteneceAlPeriodo = (movimiento) => {
    const fecha = movimiento?.fecha || movimiento?.fecha_creacion;
    if (!fecha) return false;

    const fechaTexto = String(fecha).includes('T') ? String(fecha).split('T')[0] : String(fecha);
    const mes = new Date(`${fechaTexto}T00:00:00`).getMonth() + 1;
    if (!Number.isFinite(mes)) return false;

    const mesString = String(mes).padStart(2, '0');
    return obtenerTemporadaDesdeFecha(fechaTexto) === temporadaActiva && mesesEnPeriodo.includes(mesString);
  };

  const movimientosIngresosFiltrados = ingresos.filter((movimiento) => (
    perteneceAlPeriodo(movimiento) && tieneIva(movimiento, conceptosIngresos)
  ));

  const movimientosEgresosFiltrados = egresos.filter((movimiento) => (
    perteneceAlPeriodo(movimiento) && tieneIva(movimiento, conceptosEgresos)
  ));

  const calcularIvaIngreso = (movimiento) => calcularIvaMovimiento(movimiento, obtenerIvaConcepto(movimiento, conceptosIngresos));
  const calcularIvaEgreso = (movimiento) => calcularIvaMovimiento(movimiento, obtenerIvaConcepto(movimiento, conceptosEgresos));
  const obtenerFechaMovimiento = (movimiento) => {
    const valor = movimiento?.fecha;
    if (!valor) return '';

    const texto = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    const fecha = new Date(texto);
    if (!Number.isNaN(fecha.getTime())) {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return texto.slice(0, 10);
  };

  const ivaCobrado = movimientosIngresosFiltrados.reduce((total, movimiento) => total + calcularIvaIngreso(movimiento), 0);
  const ivaPagado = movimientosEgresosFiltrados.reduce((total, movimiento) => total + calcularIvaEgreso(movimiento), 0);
  const ivaNeto = ivaCobrado - ivaPagado;

  const etiquetaIva = ivaNeto >= 0 ? 'A pagar' : 'A devolver';

  const exportarCsv = () => {
    const filas = [
      ['Tipo', 'Concepto', 'Fecha', 'Base', 'IVA'],
      ...[...movimientosIngresosFiltrados, ...movimientosEgresosFiltrados]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map((movimiento) => {
          const esIngreso = 'cuenta_id' in movimiento || movimiento?.tipo === 'ingreso';
          return [esIngreso ? 'Ingreso' : 'Egreso', movimiento.concepto || 'Sin concepto', movimiento.fecha, Number(movimiento.monto || 0), esIngreso ? calcularIvaIngreso(movimiento) : calcularIvaEgreso(movimiento)];
        })
    ];

    const csv = filas.map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'reporte-iva.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const imprimirPdf = () => {
    window.print();
  };

  return (
    <div className="reportes-container">
      {onNavigate && (
        <button className="reporte-volver-btn" onClick={() => onNavigate('reportes')}>
          ← Volver a reportes
        </button>
      )}
      <header className="reporte-encabezado-impresion">
        {clubEscudo && <img src={clubEscudo} alt="Escudo" className="reporte-escudo" />}
        <h1>{clubName}</h1>
        <h2>Cálculo de IVA</h2>
        <p>
          Temporada {temporadaActiva} · {trimestresDisponibles.find((trim) => trim.value === trimestreSeleccionado)?.label || trimestreSeleccionado}
        </p>
      </header>
      <h1>💰 Declaración de IVA</h1>

      <div className="mes-selector rango-iva">
        <label>Temporada:</label>
        <select value={temporadaActiva} onChange={(e) => onSeasonChange?.(e.target.value)}>
          {temporadasDisponibles.map((temporada) => (
            <option key={temporada} value={temporada}>Temporada {temporada}</option>
          ))}
        </select>

        <label>Trimestre:</label>
        <select
          value={trimestreSeleccionado}
          onChange={(e) => setTrimestreSeleccionado(e.target.value)}
        >
          {trimestresDisponibles.map((trim) => (
            <option key={trim.value} value={trim.value}>{trim.label}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <div className="reporte-seccion">
          <p>Cargando movimientos...</p>
        </div>
      ) : (
        <div className="reportes-grid">
          <section className="reporte-seccion">
            <h2>Resultado IVA</h2>
            <div className="datos-principales">
              <div className="dato-item ingreso">
                <h3>IVA cobrado</h3>
                <p className="cantidad">€{formatearEuros(ivaCobrado)}</p>
              </div>
              <div className="dato-item egreso">
                <h3>IVA pagado</h3>
                <p className="cantidad">€{formatearEuros(ivaPagado)}</p>
              </div>
              <div className="dato-item saldo">
                <h3>{etiquetaIva}</h3>
                <p className="cantidad">€{formatearEuros(Math.abs(ivaNeto))}</p>
              </div>
            </div>
          </section>

          <section className="reporte-seccion">
            <h2>Movimientos del periodo</h2>
            <div className="resumen-iva">
              <div className="fila-iva">
                <span>Ingresos del periodo</span>
                <strong>{movimientosIngresosFiltrados.length}</strong>
              </div>
              <div className="fila-iva">
                <span>Gastos del periodo</span>
                <strong>{movimientosEgresosFiltrados.length}</strong>
              </div>
              <div className="fila-iva">
                <span>Periodo</span>
                <strong>
                  {trimestresDisponibles.find((trim) => trim.value === trimestreSeleccionado)?.label || trimestreSeleccionado}
                </strong>
              </div>
            </div>
          </section>
        </div>
      )}

      {!cargando && (
        <div className="acciones">
          <button className="export-btn excel-btn" onClick={exportarCsv}>📊 Descargar Excel</button>
          <button className="export-btn pdf-btn" onClick={imprimirPdf}>📄 Generar PDF</button>
        </div>
      )}

      {!cargando && (
        <section className="reporte-seccion full-width">
          <h2>Detalle por tipo de movimiento</h2>
          {[...movimientosIngresosFiltrados, ...movimientosEgresosFiltrados].length > MAX_MOVIMIENTOS_MOSTRADOS && (
            <p className="info-compactada" style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              Mostrando {MAX_MOVIMIENTOS_MOSTRADOS} de {[...movimientosIngresosFiltrados, ...movimientosEgresosFiltrados].length} movimientos. Descargar Excel para ver todos.
            </p>
          )}
          <div className="tendencias-tabla">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Fecha</th>
                  <th>Base</th>
                  <th>IVA</th>
                </tr>
              </thead>
              <tbody>
                {[...movimientosIngresosFiltrados.map(m => ({ ...m, _tipo: 'ingreso' })), ...movimientosEgresosFiltrados.map(m => ({ ...m, _tipo: 'egreso' }))]
                  .sort((a, b) => obtenerFechaMovimiento(b).localeCompare(obtenerFechaMovimiento(a)))
                  .slice(0, MAX_MOVIMIENTOS_MOSTRADOS)
                  .map((movimiento, index) => {
                    const esIngreso = movimiento._tipo === 'ingreso';
                    const ivaMovimiento = esIngreso ? calcularIvaIngreso(movimiento) : calcularIvaEgreso(movimiento);
                    return (
                      <tr key={`${movimiento.id || index}-${esIngreso ? 'ing' : 'egr'}`}>
                        <td>{esIngreso ? 'Ingreso' : 'Gasto'}</td>
                        <td>{movimiento.concepto || 'Sin concepto'}</td>
                        <td>{obtenerFechaMovimiento(movimiento)}</td>
                        <td>€{formatearEuros(movimiento.monto || 0)}</td>
                        <td>€{formatearEuros(ivaMovimiento)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
