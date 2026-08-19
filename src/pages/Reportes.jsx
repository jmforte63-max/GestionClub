import { useEffect, useMemo, useState } from 'react';
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

export default function Reportes({ selectedClub = 'all', selectedSeason = '', temporadas = [], clubName = 'Club', clubEscudo = '', onSeasonChange = null, onNavigate = null, tipoReporte = 'iva' }) {
  const MAX_MOVIMIENTOS_MOSTRADOS = 9999;
  const formatearEuros = (valor) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(valor || 0));
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [conceptosIngresos, setConceptosIngresos] = useState([]);
  const [conceptosEgresos, setConceptosEgresos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState('01');
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('all');
  const [cuentas, setCuentas] = useState([]);

  const temporadaActiva = selectedSeason || obtenerTemporadaDesdeFecha(new Date().toISOString().slice(0, 10));
  const temporadasDisponibles = useMemo(() => {
    const nombres = temporadas.map((temporada) => temporada?.nombre).filter(Boolean);
    return nombres.length > 0 ? nombres : obtenerTemporadasDisponibles(temporadaActiva);
  }, [temporadas, temporadaActiva]);
  const trimestresDisponibles = useMemo(() => getTrimestresDeTemporada(temporadaActiva), [temporadaActiva]);
  const mesesDisponibles = useMemo(() => obtenerMesesDeTemporada(temporadaActiva), [temporadaActiva]);

  useEffect(() => {
    const valoresValidos = trimestresDisponibles.map((trim) => trim.value);
    setTrimestreSeleccionado((prev) => (prev && valoresValidos.includes(prev) ? prev : '01'));
  }, [trimestresDisponibles]);

  useEffect(() => {
    const valoresValidos = mesesDisponibles.map((mes) => mes.value);
    setMesSeleccionado((prev) => (prev && valoresValidos.includes(prev) ? prev : mesesDisponibles[0]?.value || '01'));
  }, [mesesDisponibles]);

  useEffect(() => {
    const cargarMovimientos = async () => {
      try {
        setCargando(true);
        const token = localStorage.getItem('token');
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const paramsIngresos = new URLSearchParams();
        const paramsEgresos = new URLSearchParams();
        const paramsCuentas = new URLSearchParams();

        if (usuario?.rol === 'admin' && usuario?.email === 'admin@club.com' && selectedClub && selectedClub !== 'all') {
          paramsIngresos.set('clubId', String(selectedClub));
          paramsEgresos.set('clubId', String(selectedClub));
          paramsCuentas.set('clubId', String(selectedClub));
        }

        paramsCuentas.set('temporada', temporadaActiva);

        const [ingresosRes, egresosRes, conceptosIngresosRes, conceptosEgresosRes, cuentasRes] = await Promise.all([
          fetch(`http://localhost:5000/api/ingresos?${paramsIngresos.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/egresos?${paramsEgresos.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('http://localhost:5000/api/conceptos-ingresos', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('http://localhost:5000/api/conceptos-egresos', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/cuentas-bancarias?${paramsCuentas.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const ingresosData = await ingresosRes.json().catch(() => []);
        const egresosData = await egresosRes.json().catch(() => []);
        const conceptosIngresosData = await conceptosIngresosRes.json().catch(() => []);
        const conceptosEgresosData = await conceptosEgresosRes.json().catch(() => []);
        const cuentasData = await cuentasRes.json().catch(() => []);

        setIngresos(Array.isArray(ingresosData) ? ingresosData : []);
        setEgresos(Array.isArray(egresosData) ? egresosData : []);
        setConceptosIngresos(Array.isArray(conceptosIngresosData) ? conceptosIngresosData : []);
        setConceptosEgresos(Array.isArray(conceptosEgresosData) ? conceptosEgresosData : []);
        setCuentas(Array.isArray(cuentasData) ? cuentasData : []);
      } catch (error) {
        console.error('Error al cargar movimientos para el reporte:', error);
        setIngresos([]);
        setEgresos([]);
        setConceptosIngresos([]);
        setConceptosEgresos([]);
        setCuentas([]);
      } finally {
        setCargando(false);
      }
    };

    cargarMovimientos();
  }, [selectedClub, temporadaActiva, tipoReporte]);

  useEffect(() => {
    if (tipoReporte !== 'estado-cuenta') return;

    if (cuentas.length === 0) {
      setCuentaSeleccionada('all');
      return;
    }

    const existe = cuentas.some((cuenta) => String(cuenta.id) === String(cuentaSeleccionada));
    if (!existe || cuentaSeleccionada === 'all') {
      setCuentaSeleccionada(String(cuentas[0].id));
    }
  }, [tipoReporte, cuentas, cuentaSeleccionada]);

  const esReporteBalance = tipoReporte === 'balance';
  const esReporteEstadoCuenta = tipoReporte === 'estado-cuenta';
  const mesesEnPeriodo = esReporteBalance
    ? [mesSeleccionado || mesesDisponibles[0]?.value || '01']
    : esReporteEstadoCuenta
      ? mesesDisponibles.map((mes) => mes.value)
    : getPeriodoActual(trimestreSeleccionado, temporadaActiva);

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

  const obtenerCuentaOrigenId = (movimiento) => Number(movimiento?.cuenta_origen_id ?? movimiento?.cuenta_id ?? 0);
  const obtenerCuentaDestinoId = (movimiento) => Number(movimiento?.cuenta_destino_id ?? 0);
  const esTraspaso = (movimiento) => Boolean(movimiento?.es_traspaso || obtenerCuentaDestinoId(movimiento));
  const obtenerFechaSaldoInicial = (cuentaId) => {
    const cuenta = cuentas.find((item) => Number(item.id) === Number(cuentaId));
    return String(cuenta?.fecha_saldo_inicial || cuenta?.fecha_creacion || '').slice(0, 10);
  };
  const obtenerMovimientosDeCuenta = (cuentaId) => {
    const fechaSaldoInicial = obtenerFechaSaldoInicial(cuentaId);
    const ingresosCuenta = ingresos
      .filter((movimiento) => Number(movimiento.cuenta_id ?? 0) === cuentaId && perteneceAlPeriodo(movimiento) && (!fechaSaldoInicial || String(movimiento.fecha || '').slice(0, 10) >= fechaSaldoInicial))
      .map((movimiento) => ({ ...movimiento, _tipo: 'ingreso' }));
    const egresosCuenta = egresos
      .filter((movimiento) => {
        const esSalida = obtenerCuentaOrigenId(movimiento) === cuentaId;
        const esEntrada = esTraspaso(movimiento) && obtenerCuentaDestinoId(movimiento) === cuentaId;
        return (esSalida || esEntrada) && perteneceAlPeriodo(movimiento) && (!fechaSaldoInicial || String(movimiento.fecha || '').slice(0, 10) >= fechaSaldoInicial);
      })
      .map((movimiento) => ({
        ...movimiento,
        _tipo: obtenerCuentaDestinoId(movimiento) === cuentaId && obtenerCuentaOrigenId(movimiento) !== cuentaId ? 'ingreso' : 'egreso'
      }));

    return [...ingresosCuenta, ...egresosCuenta];
  };

  const movimientosIngresosFiltrados = ingresos.filter((movimiento) => (
    perteneceAlPeriodo(movimiento) && tieneIva(movimiento, conceptosIngresos)
  ));

  const movimientosEgresosFiltrados = egresos.filter((movimiento) => (
    perteneceAlPeriodo(movimiento) && tieneIva(movimiento, conceptosEgresos)
  ));

  const movimientosBalanceIngresos = ingresos.filter((movimiento) => perteneceAlPeriodo(movimiento));
  const movimientosBalanceEgresos = egresos.filter((movimiento) => perteneceAlPeriodo(movimiento));

  const cuentaSeleccionadaValida = !esReporteEstadoCuenta || cuentas.some((cuenta) => String(cuenta.id) === String(cuentaSeleccionada));
  const movimientosPorCuenta = (() => {
    if (!esReporteEstadoCuenta || !cuentaSeleccionadaValida || cuentaSeleccionada === 'all') return [];

    const cuentaId = Number(cuentaSeleccionada);
    return obtenerMovimientosDeCuenta(cuentaId);
  })();

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

  const movimientosDetalle = esReporteBalance
    ? [...movimientosBalanceIngresos.map((m) => ({ ...m, _tipo: 'ingreso' })), ...movimientosBalanceEgresos.map((m) => ({ ...m, _tipo: 'egreso' }))]
    : esReporteEstadoCuenta
      ? [...movimientosPorCuenta].sort((a, b) => obtenerFechaMovimiento(a).localeCompare(obtenerFechaMovimiento(b)))
      : [...movimientosIngresosFiltrados.map((m) => ({ ...m, _tipo: 'ingreso' })), ...movimientosEgresosFiltrados.map((m) => ({ ...m, _tipo: 'egreso' }))];

  const calcularIvaIngreso = (movimiento) => calcularIvaMovimiento(movimiento, obtenerIvaConcepto(movimiento, conceptosIngresos));
  const calcularIvaEgreso = (movimiento) => calcularIvaMovimiento(movimiento, obtenerIvaConcepto(movimiento, conceptosEgresos));

  const ivaCobrado = movimientosIngresosFiltrados.reduce((total, movimiento) => total + calcularIvaIngreso(movimiento), 0);
  const ivaPagado = movimientosEgresosFiltrados.reduce((total, movimiento) => total + calcularIvaEgreso(movimiento), 0);
  const ivaNeto = ivaCobrado - ivaPagado;

  const cuentaActiva = cuentas.find((cuenta) => String(cuenta.id) === String(cuentaSeleccionada)) || null;
  const movimientosPeriodoCuenta = esReporteEstadoCuenta && cuentaSeleccionadaValida && cuentaSeleccionada !== 'all'
    ? movimientosPorCuenta
    : [];

  const saldoInicialEstadoCuenta = (() => {
    if (!esReporteEstadoCuenta || !cuentaSeleccionadaValida || cuentaSeleccionada === 'all') return 0;
    return Number(cuentaActiva?.saldo_inicial ?? cuentaActiva?.saldo ?? 0);
  })();

  const ingresosEstadoCuenta = movimientosPeriodoCuenta.filter((movimiento) => movimiento._tipo === 'ingreso').reduce((total, movimiento) => total + Number(movimiento.total_con_iva ?? movimiento.monto ?? 0), 0);
  const gastosEstadoCuenta = movimientosPeriodoCuenta.filter((movimiento) => movimiento._tipo === 'egreso').reduce((total, movimiento) => total + Number(movimiento.total_con_iva ?? movimiento.monto ?? 0), 0);
  const saldoFinalEstadoCuenta = saldoInicialEstadoCuenta + ingresosEstadoCuenta - gastosEstadoCuenta;

  const calcularTotalConIva = (movimiento, conceptos) => {
    const iva = obtenerIvaConcepto(movimiento, conceptos);
    const base = Number(movimiento?.monto || 0);
    const totalGuardado = Number(movimiento?.total_con_iva ?? 0);
    return totalGuardado > 0 ? totalGuardado : base * (1 + iva / 100);
  };

  const ingresosPeriodo = ingresos.filter((movimiento) => perteneceAlPeriodo(movimiento));
  const egresosPeriodo = egresos.filter((movimiento) => perteneceAlPeriodo(movimiento));
  const totalIngresosPeriodo = ingresosPeriodo.reduce((total, movimiento) => total + calcularTotalConIva(movimiento, conceptosIngresos), 0);
  const totalGastosPeriodo = egresosPeriodo.reduce((total, movimiento) => total + calcularTotalConIva(movimiento, conceptosEgresos), 0);
  const balancePeriodo = totalIngresosPeriodo - totalGastosPeriodo;

  const etiquetaIva = ivaNeto >= 0 ? 'A pagar' : 'A devolver';
  const etiquetaBalance = balancePeriodo >= 0 ? 'Balance positivo' : 'Balance negativo';

  const exportarCsv = () => {
    const movimientosExportacion = esReporteBalance
      ? [...movimientosBalanceIngresos, ...movimientosBalanceEgresos]
      : [...movimientosIngresosFiltrados, ...movimientosEgresosFiltrados];

    const filas = [
      ['Tipo', 'Concepto', 'Descripción', 'Fecha', 'Base', 'Saldo'],
      ...movimientosExportacion
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map((movimiento) => {
          const esIngreso = 'cuenta_id' in movimiento || movimiento?.tipo === 'ingreso';
          return [esIngreso ? 'Ingreso' : 'Egreso', movimiento.concepto || 'Sin concepto', movimiento.descripcion || movimiento.detalle || '', movimiento.fecha, Number(movimiento.monto || 0), esIngreso ? calcularIvaIngreso(movimiento) : calcularIvaEgreso(movimiento)];
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
        <h2>{esReporteBalance ? 'Balance financiero' : esReporteEstadoCuenta ? 'Estado de cuenta' : 'Cálculo de IVA'}</h2>
        <p>
          Temporada {temporadaActiva} · {esReporteBalance
            ? (mesesDisponibles.find((mes) => mes.value === mesSeleccionado)?.label || 'Mes')
            : esReporteEstadoCuenta
              ? (cuentaActiva ? cuentaActiva.nombre : 'Cuenta seleccionada')
              : (trimestresDisponibles.find((trim) => trim.value === trimestreSeleccionado)?.label || trimestreSeleccionado)}
        </p>
      </header>
      <h1>{esReporteBalance ? '💰 Balance financiero' : esReporteEstadoCuenta ? '🏦 Estado de cuenta' : '💰 Declaración de IVA'}</h1>

      {esReporteEstadoCuenta && cuentas.length === 0 && !cargando && (
        <div className="reporte-seccion">
          <p>No hay cuentas bancarias creadas para esta temporada/club, así que aún no hay movimientos disponibles.</p>
        </div>
      )}

      <div className="mes-selector rango-iva">
        <label>Temporada:</label>
        <select value={temporadaActiva} onChange={(e) => onSeasonChange?.(e.target.value)}>
          {temporadasDisponibles.map((temporada) => (
            <option key={temporada} value={temporada}>Temporada {temporada}</option>
          ))}
        </select>

        {esReporteEstadoCuenta ? (
          <>
            <label>Cuenta:</label>
            <select value={cuentaSeleccionadaValida ? cuentaSeleccionada : 'all'} onChange={(e) => setCuentaSeleccionada(e.target.value)} disabled={cuentas.length === 0}>
              {cuentas.length === 0 ? (
                <option value="all">Sin cuentas</option>
              ) : (
                cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={String(cuenta.id)}>{cuenta.nombre}</option>
                ))
              )}
            </select>
          </>
        ) : esReporteBalance ? (
          <>
            <label>Mes:</label>
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            >
              {mesesDisponibles.map((mes) => (
                <option key={mes.value} value={mes.value}>{mes.label}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label>Trimestre:</label>
            <select
              value={trimestreSeleccionado}
              onChange={(e) => setTrimestreSeleccionado(e.target.value)}
            >
              {trimestresDisponibles.map((trim) => (
                <option key={trim.value} value={trim.value}>{trim.label}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {cargando ? (
        <div className="reporte-seccion">
          <p>Cargando movimientos...</p>
        </div>
      ) : (
        <div className="reportes-grid">
          {esReporteEstadoCuenta ? (
            <>
              <section className="reporte-seccion">
                <h2>Estado de cuenta</h2>
                <div className="datos-principales">
                  <div className="dato-item ingreso">
                    <h3>Saldo inicial</h3>
                    <p className="cantidad">€{formatearEuros(saldoInicialEstadoCuenta)}</p>
                  </div>
                  <div className="dato-item egreso">
                    <h3>Ingresos</h3>
                    <p className="cantidad">€{formatearEuros(ingresosEstadoCuenta)}</p>
                  </div>
                  <div className="dato-item saldo">
                    <h3>Gastos</h3>
                    <p className="cantidad">€{formatearEuros(gastosEstadoCuenta)}</p>
                  </div>
                </div>
                <div className="datos-principales" style={{ marginTop: '1rem' }}>
                  <div className="dato-item saldo">
                    <h3>Saldo final</h3>
                    <p className="cantidad">€{formatearEuros(saldoFinalEstadoCuenta)}</p>
                  </div>
                  <div className="dato-item ingreso">
                    <h3>Movimientos del periodo</h3>
                    <p className="cantidad">{movimientosPeriodoCuenta.length}</p>
                  </div>
                </div>
              </section>
            </>
          ) : esReporteBalance ? (
            <>
              <section className="reporte-seccion">
                <h2>Balance entre ingresos y gastos</h2>
                <div className="datos-principales">
                  <div className="dato-item ingreso">
                    <h3>Ingresos</h3>
                    <p className="cantidad">€{formatearEuros(totalIngresosPeriodo)}</p>
                  </div>
                  <div className="dato-item egreso">
                    <h3>Gastos</h3>
                    <p className="cantidad">€{formatearEuros(totalGastosPeriodo)}</p>
                  </div>
                  <div className="dato-item saldo">
                    <h3>{etiquetaBalance}</h3>
                    <p className="cantidad">€{formatearEuros(Math.abs(balancePeriodo))}</p>
                  </div>
                </div>
              </section>

              <section className="reporte-seccion">
                <h2>Movimientos del periodo</h2>
                <div className="resumen-iva">
                  <div className="fila-iva">
                    <span>Ingresos del periodo</span>
                    <strong>{ingresosPeriodo.length}</strong>
                  </div>
                  <div className="fila-iva">
                    <span>Gastos del periodo</span>
                    <strong>{egresosPeriodo.length}</strong>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
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
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {!cargando && (
        <div className="acciones">
          <button className="export-btn pdf-btn" onClick={imprimirPdf}>📄 Generar PDF</button>
        </div>
      )}

      {!cargando && (
        <section className="reporte-seccion full-width">
          <h2>{esReporteEstadoCuenta ? 'Movimientos del periodo' : 'Detalle por tipo de movimiento'}</h2>
          {movimientosDetalle.length > MAX_MOVIMIENTOS_MOSTRADOS && (
            <p className="info-compactada" style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              Mostrando {MAX_MOVIMIENTOS_MOSTRADOS} de {movimientosDetalle.length} movimientos.
            </p>
          )}
          <div className="tendencias-tabla">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Descripción</th>
                  <th>Base</th>
                  <th>IVA</th>
                  <th>{esReporteEstadoCuenta ? 'Total con IVA' : esReporteBalance ? 'Total' : 'IVA'}</th>
                </tr>
              </thead>
              <tbody>
                {(esReporteEstadoCuenta ? movimientosPeriodoCuenta : movimientosDetalle)
                  .sort((a, b) => obtenerFechaMovimiento(b).localeCompare(obtenerFechaMovimiento(a)))
                  .slice(0, MAX_MOVIMIENTOS_MOSTRADOS)
                  .map((movimiento, index) => {
                    const esIngreso = movimiento._tipo === 'ingreso';
                    const ivaMovimiento = esIngreso ? calcularIvaIngreso(movimiento) : calcularIvaEgreso(movimiento);
                    const totalConIva = calcularTotalConIva(movimiento, esIngreso ? conceptosIngresos : conceptosEgresos);
                    const valorColumna = esReporteBalance ? totalConIva : ivaMovimiento;
                    return (
                      <tr key={`${movimiento.id || index}-${esIngreso ? 'ing' : 'egr'}`}>
                        <td>{obtenerFechaMovimiento(movimiento)}</td>
                        <td>{esIngreso ? 'Ingreso' : 'Gasto'}</td>
                        <td>{movimiento.concepto || 'Sin concepto'}</td>
                        <td>{movimiento.descripcion || movimiento.detalle || 'Sin descripción'}</td>
                        <td>€{formatearEuros(movimiento.monto || 0)}</td>
                        <td>€{formatearEuros(valorColumna)}</td>
                        <td>€{formatearEuros(esReporteEstadoCuenta ? totalConIva : valorColumna)}</td>
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
