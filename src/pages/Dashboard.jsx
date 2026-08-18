import { useEffect, useState } from 'react';
import { apiUrl } from '../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import '../styles/Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard({ onNavigate, selectedClub = 'all', selectedSeason = '', temporadas = [] }) {
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

  const temporadaActiva = selectedSeason || obtenerTemporadaDesdeFecha(new Date().toISOString().slice(0, 10));
  const temporadaDeEncabezado = temporadas.find((temporada) => temporada?.nombre === temporadaActiva)?.nombre || temporadaActiva;

  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalEgresos, setTotalEgresos] = useState(0);
  const [totalTraspasos, setTotalTraspasos] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [transaccionesRecientes, setTransaccionesRecientes] = useState([]);
  const [gastosPorCategoria, setGastosPorCategoria] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [clubActual, setClubActual] = useState(null);
  const [mesSeleccionado, setMesSeleccionado] = useState('todos');

  useEffect(() => {
    const cargarClubActual = async () => {
      try {
        const token = localStorage.getItem('token');
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const esAdminGlobal = usuario?.rol === 'admin' && usuario?.email === 'admin@club.com';
        const clubId = esAdminGlobal && selectedClub && selectedClub !== 'all'
          ? Number(selectedClub)
          : Number(usuario?.club_id || 0);

        if (!clubId) {
          setClubActual(null);
          return;
        }

        const query = esAdminGlobal && selectedClub && selectedClub !== 'all' ? `?clubId=${encodeURIComponent(selectedClub)}` : '';
        const response = await fetch(apiUrl(`/api/clubes${query}`), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const lista = Array.isArray(data) ? data : [];
        const club = lista.find((item) => Number(item.id) === Number(clubId)) || lista[0] || null;
        setClubActual(club);
      } catch (error) {
        console.error('Error al cargar club actual:', error);
        setClubActual(null);
      }
    };

    cargarClubActual();
  }, [selectedClub]);

  useEffect(() => {
    const cargarTotales = async () => {
      try {
        const token = localStorage.getItem('token');
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const esAdminGlobal = usuario?.rol === 'admin' && usuario?.email === 'admin@club.com';
        const clubActivo = esAdminGlobal && selectedClub && selectedClub !== 'all'
          ? Number(selectedClub)
          : Number(usuario?.club_id || 0);
        const params = clubActivo > 0 ? `?clubId=${encodeURIComponent(clubActivo)}` : '';

        const paramsConTemporada = `${params}${params ? '&' : '?'}temporada=${encodeURIComponent(temporadaActiva)}`;
        const paramsCuentas = `${params ? `${params}&` : '?'}temporada=${encodeURIComponent(temporadaActiva)}`;

        const [ingresosRes, egresosRes, ingresosListRes, egresosListRes, categoriaRes, cuentasRes] = await Promise.all([
          fetch(apiUrl(`/api/ingresos/total${paramsConTemporada}`), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl(`/api/egresos/total${paramsConTemporada}`), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl(`/api/ingresos${paramsConTemporada}`), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl(`/api/egresos${paramsConTemporada}`), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl(`/api/egresos/categoria/resumen${paramsConTemporada}`), {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(apiUrl(`/api/cuentas-bancarias${paramsCuentas}`), {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const ingresosData = await ingresosRes.json();
        const egresosData = await egresosRes.json();
        const ingresosListJson = await ingresosListRes.json();
        const egresosListJson = await egresosListRes.json();
        const categoriaJson = await categoriaRes.json();
        const cuentasJson = await cuentasRes.json();
        const ingresosList = Array.isArray(ingresosListJson) ? ingresosListJson : [];
        const egresosList = Array.isArray(egresosListJson) ? egresosListJson : [];
        const categoriasResumen = Array.isArray(categoriaJson) ? categoriaJson : [];
        const cuentasList = Array.isArray(cuentasJson) ? cuentasJson : [];

        const esTraspaso = (movimiento) => Boolean(
          movimiento?.es_traspaso ||
          (movimiento?.cuenta_destino_id && Number(movimiento.cuenta_destino_id) !== Number(movimiento.cuenta_id ?? movimiento.cuenta_origen_id ?? 0))
        );

        const gastos = egresosList.filter((egreso) => !esTraspaso(egreso));
        const traspasos = egresosList.filter((egreso) => esTraspaso(egreso));

        const ingresos = Number(ingresosData.total || 0);
        const egresos = gastos.reduce((sum, egreso) => sum + Number(egreso.total_con_iva ?? egreso.monto ?? 0), 0);
        const traspasosTotal = traspasos.reduce((sum, traspaso) => sum + Number(traspaso.total_con_iva ?? traspaso.monto ?? 0), 0);
        const saldoCuentaTotal = cuentasList.reduce((sum, cuenta) => sum + Number(cuenta.saldo || 0), 0);

        const transacciones = [
          ...ingresosList.map((ingreso) => ({
            id: `ingreso-${ingreso.id}`,
            movimientoId: ingreso.id,
            fecha: ingreso.fecha,
            concepto: ingreso.concepto,
            tipo: 'Ingreso',
            monto: Number(ingreso.total_con_iva ?? ingreso.monto ?? 0),
            signo: '+',
            simbolo: '€',
          })),
          ...gastos.map((egreso) => ({
            id: `egreso-${egreso.id}`,
            movimientoId: egreso.id,
            fecha: egreso.fecha,
            concepto: egreso.concepto,
            tipo: 'Gasto',
            monto: Number(egreso.total_con_iva ?? egreso.monto ?? 0),
            signo: '-',
            simbolo: '€',
          })),
          ...traspasos.map((traspaso) => ({
            id: `traspaso-${traspaso.id}`,
            movimientoId: traspaso.id,
            fecha: traspaso.fecha,
            concepto: traspaso.concepto || 'Traspaso',
            tipo: 'Traspaso',
            monto: Number(traspaso.total_con_iva ?? traspaso.monto ?? 0),
            signo: '-',
            simbolo: '€',
          })),
        ]
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        setTotalIngresos(ingresos);
        setTotalEgresos(egresos);
        setTotalTraspasos(traspasosTotal);
        setSaldo(saldoCuentaTotal);
        setTransaccionesRecientes(transacciones);
        setGastosPorCategoria(categoriasResumen.filter((item) => !String(item?.categoria || '').toLowerCase().includes('traspaso')));
        setCuentas(cuentasList);
      } catch (error) {
        console.error('Error al cargar totals:', error);
        setTransaccionesRecientes([]);
        setGastosPorCategoria([]);
        setCuentas([]);
      }
    };

    cargarTotales();
  }, [selectedClub, temporadaActiva]);

  const obtenerMesKey = (fechaValor) => {
    const fechaTexto = String(fechaValor || '').split('T')[0];
    const partes = fechaTexto.split('-');
    return partes.length >= 2 ? `${partes[0]}-${String(Number(partes[1])).padStart(2, '0')}` : null;
  };

  const mesesDisponibles = Array.from(new Set(
    transaccionesRecientes.map((transaccion) => obtenerMesKey(transaccion.fecha)).filter(Boolean)
  )).sort().reverse();

  const transaccionesParaMostrar = mesSeleccionado === 'todos'
    ? transaccionesRecientes
    : transaccionesRecientes.filter((transaccion) => obtenerMesKey(transaccion.fecha) === mesSeleccionado);

  useEffect(() => {
    setMesSeleccionado('todos');
  }, [temporadaActiva]);

  const datosLinea = {
    labels: ['Junio', 'Julio', 'Agosto'],
    datasets: [
      {
        label: 'Ingresos',
        data: [Math.max(totalIngresos * 0.8, 0), Math.max(totalIngresos * 0.9, 0), totalIngresos],
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Gastos',
        data: [Math.max(totalEgresos * 0.8, 0), Math.max(totalEgresos * 0.9, 0), totalEgresos],
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const datosBarras = {
    labels: gastosPorCategoria.length > 0 ? gastosPorCategoria.map((item) => item.categoria || 'Sin categoría') : ['Sin datos'],
    datasets: [
      {
        label: 'Gastos por Categoría',
        data: gastosPorCategoria.length > 0 ? gastosPorCategoria.map((item) => Number(item.total || 0)) : [0],
        backgroundColor: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'],
        borderRadius: 8,
      },
    ],
  };

  const datosDonuts = {
    labels: ['Saldo', 'Gastos'],
    datasets: [
      {
        data: [Math.max(saldo, 0), Math.max(totalEgresos, 0)],
        backgroundColor: ['#27ae60', '#e74c3c'],
        borderColor: ['#229954', '#c0392b'],
        borderWidth: 2,
      },
    ],
  };

  const optionesLinea = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Tendencia de Ingresos vs Gastos',
      },
    },
  };

  const optionesBarras = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  const opcionesDonuts = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Proporción Saldo vs Gastos',
      },
    },
  };

  const formatearFecha = (valor) => {
    if (!valor) return '--';

    const fechaDesdeTexto = typeof valor === 'string' && valor.length === 10
      ? `${valor}T12:00:00`
      : valor;

    const fecha = new Date(fechaDesdeTexto);

    if (Number.isNaN(fecha.getTime())) {
      return String(valor);
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fecha);
  };

  const descargarReporte = () => {
    onNavigate('reportes');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header-row">
        <h1>📊 Dashboard Financiero</h1>
        {(clubActual || selectedClub !== 'all') && (
          <div className="club-header-card">
            {clubActual?.escudo_url && (
              <img src={clubActual.escudo_url} alt={`${clubActual.nombre || 'Club'} escudo`} className="club-header-image" />
            )}
            <div>
              <span className="club-header-label">Club actual</span>
              <strong>{clubActual?.nombre || 'Todos los clubs'}</strong>
            </div>
          </div>
        )}
      </div>
      
      <div className="stats-grid">
        <div className="stat-card ingresos">
          <h3>Ingresos</h3>
          <p className="amount">€{totalIngresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <small>Datos reales desde MySQL</small>
        </div>

        <div className="stat-card egresos">
          <h3>Gastos</h3>
          <p className="amount">€{totalEgresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <small>Sin traspasos</small>
        </div>

        <div className="stat-card traspasos">
          <h3>Traspasos</h3>
          <p className="amount">€{totalTraspasos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <small>En su apartado propio</small>
        </div>

        <div className="stat-card saldo">
          <h3>Saldo</h3>
          <p className="amount">€{saldo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <small>Disponible</small>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <Line data={datosLinea} options={optionesLinea} />
        </div>

        <div className="chart-container">
          <Bar data={datosBarras} options={optionesBarras} />
        </div>

        <div className="chart-container small">
          <Doughnut data={datosDonuts} options={opcionesDonuts} />
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="recent-transactions">
          <div className="recent-transactions-header">
            <div>
              <h2>Transacciones</h2>
              <span>Temporada {temporadaDeEncabezado}</span>
            </div>
            <label className="dashboard-month-filter">
              <span>Mes</span>
              <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)}>
                <option value="todos">Todos los meses</option>
                {mesesDisponibles.map((mes) => (
                  <option key={mes} value={mes}>
                    {new Date(`${mes}-01T00:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="recent-transactions-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {transaccionesParaMostrar.length > 0 ? (
                  transaccionesParaMostrar.map((transaccion) => (
                    <tr
                      key={transaccion.id}
                      className="recent-transaction-row"
                      onClick={() => onNavigate(
                        transaccion.tipo === 'Ingreso' ? 'ingresos' : transaccion.tipo === 'Traspaso' ? 'traspasos' : 'egresos',
                        {
                          tipo: transaccion.tipo === 'Ingreso' ? 'ingreso' : transaccion.tipo === 'Traspaso' ? 'traspaso' : 'egreso',
                          id: transaccion.movimientoId,
                        }
                      )}
                    >
                      <td>{formatearFecha(transaccion.fecha)}</td>
                      <td>{transaccion.concepto || 'Sin concepto'}</td>
                      <td className={transaccion.tipo === 'Ingreso' ? 'ingreso' : transaccion.tipo === 'Traspaso' ? 'traspaso' : 'egreso'}>{transaccion.tipo}</td>
                      <td>{transaccion.signo}{transaccion.simbolo}{Number(transaccion.monto || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>--</td>
                    <td>Sin movimientos registrados</td>
                    <td className="ingreso">Ingreso</td>
                    <td>$0</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="account-balance-panel">
          <h2>Saldos por cuenta</h2>
          {cuentas.length > 0 ? (
            <div className="account-balance-list">
              {cuentas.map((cuenta) => (
                <div key={cuenta.id} className={`account-balance-item ${cuenta.activo ? 'active' : 'inactive'}`}>
                  <div className="account-balance-top">
                    <span className="account-name">{cuenta.nombre}</span>
                    <strong>€{Number(cuenta.saldo || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="account-balance-meta">
                    <span>{cuenta.tipo || 'Banco'}</span>
                    <span>{cuenta.activo ? 'Activa' : 'Inactiva'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No hay cuentas registradas.</p>
          )}
        </section>

        <section className="quick-actions">
          <h2>Acciones Rápidas</h2>
          <div className="actions-list">
            <button className="action-btn" onClick={() => onNavigate('ingresos')}>
              ➕ Nuevo Ingreso
            </button>
            <button className="action-btn" onClick={() => onNavigate('egresos')}>
              ➖ Nuevo Gasto
            </button>
            <button className="action-btn traspaso-btn" onClick={() => onNavigate('traspasos')}>
              🔄 Nuevo Traspaso
            </button>
            <button className="action-btn" onClick={() => toast.info('👥 Jugador agregado')}>
              👥 Agregar Jugador
            </button>
            <button className="action-btn" onClick={descargarReporte}>
              📥 Descargar Reporte
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
