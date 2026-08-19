import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Dashboard from './pages/Dashboard';
import Clubes from './pages/Clubes';
import Jugadores from './pages/Jugadores';
import Ingresos from './pages/Ingresos';
import Egresos from './pages/Egresos';
import Calendario from './pages/Calendario';
import Reportes from './pages/Reportes';
import ReportesMenu from './pages/ReportesMenu';
import MovimientosMenu from './pages/MovimientosMenu';
import ValidacionClubes from './pages/ValidacionClubes';
import CuentasBancarias from './pages/CuentasBancarias';
import ProtectedRoute from './pages/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import './App.css';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const obtenerTemporadaPorDefecto = () => {
    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const esDesdeJulio = fechaActual.getMonth() >= 6;

    return esDesdeJulio
      ? `${anioActual}/${String(anioActual + 1).slice(-2)}`
      : `${anioActual - 1}/${String(anioActual).slice(-2)}`;
  };

  const temporadasDisponibles = () => {
    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const esDesdeJulio = fechaActual.getMonth() >= 6;

    const temporadaBase = esDesdeJulio ? anioActual : anioActual - 1;

    return [
      `${temporadaBase - 1}/${String(temporadaBase).slice(-2)}`,
      `${temporadaBase}/${String(temporadaBase + 1).slice(-2)}`,
      `${temporadaBase + 1}/${String(temporadaBase + 2).slice(-2)}`
    ];
  };

  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState(null);
  const [menuAdminAbierto, setMenuAdminAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ nombre: '', email: '', password: '', escudo_url: '' });
  const [perfilError, setPerfilError] = useState('');
  const [perfilSuccess, setPerfilSuccess] = useState('');
  const [temporadaFormAbierto, setTemporadaFormAbierto] = useState(false);
  const [temporadaForm, setTemporadaForm] = useState({
    nombre: '',
    anio_inicio: '',
    anio_fin: '',
    fecha_inicio: '',
    fecha_fin: '',
    activo: true
  });
  const [temporadaFormError, setTemporadaFormError] = useState('');
  const [temporadaFormSuccess, setTemporadaFormSuccess] = useState('');
  const [clubes, setClubes] = useState([]);
  const [clubActual, setClubActual] = useState(null);
  const [temporadas, setTemporadas] = useState([]);
  const [clubSeleccionado, setClubSeleccionado] = useState('all');
  const clubActivo = clubes.find((club) => String(club.id) === String(clubSeleccionado)) || clubActual || null;
  const [temporadaActual, setTemporadaActual] = useState(() => {
    const almacenada = localStorage.getItem('temporadaActual');
    return almacenada || obtenerTemporadaPorDefecto();
  });
  const { usuario, logout, updateProfile } = useAuth();
  const esAdminGlobal = usuario?.rol === 'admin' && usuario?.email === 'admin@club.com';

  useEffect(() => {
    const cargarTemporadas = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/temporadas?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          return;
        }

        setTemporadas(data);

        const opciones = data.map((temporada) => temporada.nombre);
        const temporadaDefecto = obtenerTemporadaPorDefecto();

        if (!opciones.includes(temporadaActual) && !opciones.includes(temporadaDefecto)) {
          setTemporadaActual(data[0]?.nombre || temporadaDefecto);
          return;
        }

        if (!opciones.includes(temporadaActual)) {
          setTemporadaActual(temporadaDefecto);
        }
      } catch (error) {
        console.error('Error al cargar temporadas:', error);
      }
    };

    if (usuario) {
      cargarTemporadas();
    }
  }, [usuario, temporadaActual]);

  useEffect(() => {
    const opciones = temporadas.length > 0 ? temporadas.map((temporada) => temporada.nombre) : temporadasDisponibles();
    const temporadaDefecto = obtenerTemporadaPorDefecto();

    if (!opciones.includes(temporadaActual)) {
      setTemporadaActual(temporadaDefecto);
      return;
    }

    localStorage.setItem('temporadaActual', temporadaActual);
  }, [temporadaActual, temporadas]);

  useEffect(() => {
    if (!usuario) {
      setClubSeleccionado('all');
      setClubActual(null);
      return;
    }

    const clubUsuario = usuario?.club_id ? String(usuario.club_id) : 'all';

    if (usuario.rol !== 'admin' || usuario.email !== 'admin@club.com') {
      setClubSeleccionado(clubUsuario);
      localStorage.setItem('clubSeleccionado', clubUsuario);
      setClubes([]);
      return;
    }

    const guardado = localStorage.getItem('clubSeleccionado');
    if (guardado && guardado !== 'all') {
      setClubSeleccionado(guardado);
    } else {
      setClubSeleccionado('all');
      localStorage.setItem('clubSeleccionado', 'all');
    }
  }, [usuario]);

  useEffect(() => {
    const cargarClubActual = async () => {
      if (!usuario) {
        setClubActual(null);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/clubes', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          setClubActual(null);
          return;
        }

        const data = await response.json();
        const lista = Array.isArray(data) ? data : [];

        if (esAdminGlobal && clubSeleccionado && clubSeleccionado !== 'all') {
          const club = lista.find((item) => String(item.id) === String(clubSeleccionado)) || lista[0] || null;
          setClubActual(club);
          return;
        }

        const club = lista[0] || null;
        setClubActual(club);
      } catch (error) {
        console.error('Error al cargar club actual para badge:', error);
        setClubActual(null);
      }
    };

    if (usuario) {
      cargarClubActual();
    }
  }, [usuario, esAdminGlobal, clubSeleccionado]);

  useEffect(() => {
    if (usuario) {
      setPerfilForm({
        nombre: usuario.nombre || '',
        email: usuario.email || '',
        password: '',
        escudo_url: clubActual?.escudo_url || ''
      });
    }
  }, [usuario, clubActual]);

  useEffect(() => {
    if (!usuario || usuario.rol !== 'admin' || usuario.email !== 'admin@club.com') {
      return;
    }

    const cargarClubes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/clubes?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('No se pudieron cargar los clubes');
        }

        const data = await response.json();
        const lista = Array.isArray(data) ? data : [];
        setClubes(lista);

        const clubActualValido = lista.some((club) => String(club.id) === String(clubSeleccionado));

        if (clubSeleccionado !== 'all' && !clubActualValido) {
          const primerClub = lista[0] ? String(lista[0].id) : 'all';
          setClubSeleccionado(primerClub);
          localStorage.setItem('clubSeleccionado', primerClub);
          return;
        }

        if (clubSeleccionado === 'all' && lista.length > 0) {
          localStorage.setItem('clubSeleccionado', 'all');
        }
      } catch (error) {
        console.error('Error al cargar clubes para selector:', error);
      }
    };

    cargarClubes();
  }, [usuario, clubSeleccionado]);

  const cambiarClub = (valor) => {
    setClubSeleccionado(valor);
    localStorage.setItem('clubSeleccionado', valor);
  };

  const guardarPerfil = async () => {
    if (!perfilForm.nombre.trim()) {
      setPerfilError('El nombre no puede estar vacío');
      return;
    }

    const payload = {
      nombre: perfilForm.nombre.trim(),
      email: perfilForm.email.trim(),
      password: perfilForm.password.trim(),
      escudo_url: perfilForm.escudo_url.trim()
    };

    if (esAdminGlobal) {
      delete payload.email;
    }

    const resultado = await updateProfile(payload);

    if (!resultado.success) {
      setPerfilError(resultado.error || 'No se pudo guardar el perfil');
      setPerfilSuccess('');
      return;
    }

    setPerfilSuccess('Perfil actualizado correctamente');
    setPerfilError('');
    setPerfilAbierto(false);
    setPerfilForm({
      nombre: resultado.usuario.nombre || '',
      email: resultado.usuario.email || '',
      password: '',
      escudo_url: clubActual?.escudo_url || ''
    });
  };

  const guardarTemporada = async () => {
    setTemporadaFormError('');
    setTemporadaFormSuccess('');

    if (!temporadaForm.nombre.trim()) {
      setTemporadaFormError('El nombre de la temporada es obligatorio');
      return;
    }

    const fechaInicio = temporadaForm.fecha_inicio || (temporadaForm.anio_inicio ? `${temporadaForm.anio_inicio}-07-01` : '');
    const fechaFin = temporadaForm.fecha_fin || (temporadaForm.anio_fin ? `${temporadaForm.anio_fin}-06-30` : '');

    if (!fechaInicio || !fechaFin) {
      setTemporadaFormError('Debes indicar la fecha de inicio y fin de la temporada o al menos el año');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        nombre: temporadaForm.nombre.trim(),
        anio_inicio: temporadaForm.anio_inicio ? Number(temporadaForm.anio_inicio) : new Date(`${fechaInicio}T00:00:00`).getFullYear(),
        anio_fin: temporadaForm.anio_fin ? Number(temporadaForm.anio_fin) : new Date(`${fechaFin}T00:00:00`).getFullYear(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        activo: temporadaForm.activo
      };

      const response = await fetch('http://localhost:5000/api/temporadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo crear la temporada');
      }

      const nuevaTemporada = data.nombre || temporadaForm.nombre.trim();
      setTemporadas((prev) => {
        const lista = [...prev, data];
        return lista.sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
      });
      setTemporadaActual(nuevaTemporada);
      localStorage.setItem('temporadaActual', nuevaTemporada);
      setTemporadaFormSuccess('Temporada creada correctamente');
      setTemporadaForm({
        nombre: '',
        anio_inicio: '',
        anio_fin: '',
        fecha_inicio: '',
        fecha_fin: '',
        activo: true
      });
      setTimeout(() => {
        setTemporadaFormAbierto(false);
        setTemporadaFormSuccess('');
      }, 1200);
    } catch (error) {
      setTemporadaFormError(error.message || 'Error al guardar la temporada');
    }
  };

  const rutaPorPagina = {
    dashboard: '/dashboard',
    clubes: '/clubes',
    'validacion-clubes': '/validacion-clubes',
    jugadores: '/jugadores',
    ingresos: '/ingresos',
    egresos: '/egresos',
    traspasos: '/traspasos',
    movimientos: '/movimientos',
    calendario: '/calendario',
    reportes: '/reportes',
    'reporte-iva': '/reporte-iva',
    'reporte-balance': '/reporte-balance',
    'reporte-cuenta': '/reporte-cuenta',
    'cuentas-bancarias': '/cuentas-bancarias'
  };

  const navegarA = (pagina, movimiento = null) => {
    setMovimientoSeleccionado(movimiento);
    navigate(rutaPorPagina[pagina] || '/dashboard');
  };

  const renderPagina = (pagina) => {
    switch (pagina) {
      case 'dashboard':
        return <Dashboard onNavigate={navegarA} selectedClub={clubSeleccionado} selectedSeason={temporadaActual} temporadas={temporadas} />;
      case 'clubes':
        return esAdminGlobal ? <Clubes selectedClub={clubSeleccionado} selectedSeason={temporadaActual} /> : <Dashboard onNavigate={navegarA} selectedClub={clubSeleccionado} selectedSeason={temporadaActual} />;
      case 'validacion-clubes':
        return esAdminGlobal ? <ValidacionClubes selectedSeason={temporadaActual} /> : <Dashboard onNavigate={navegarA} selectedClub={clubSeleccionado} selectedSeason={temporadaActual} />;
      case 'jugadores':
        return <Jugadores selectedClub={clubSeleccionado} selectedSeason={temporadaActual} />;
      case 'ingresos':
        return <Ingresos selectedClub={clubSeleccionado} selectedSeason={temporadaActual} onSeasonChange={setTemporadaActual} movimientoSeleccionado={movimientoSeleccionado} onLimpiarMovimiento={() => setMovimientoSeleccionado(null)} />;
      case 'egresos':
        return <Egresos selectedClub={clubSeleccionado} selectedSeason={temporadaActual} onSeasonChange={setTemporadaActual} movimientoSeleccionado={movimientoSeleccionado} onLimpiarMovimiento={() => setMovimientoSeleccionado(null)} soloTraspasos={false} />;
      case 'traspasos':
        return <Egresos selectedClub={clubSeleccionado} selectedSeason={temporadaActual} onSeasonChange={setTemporadaActual} movimientoSeleccionado={movimientoSeleccionado} onLimpiarMovimiento={() => setMovimientoSeleccionado(null)} soloTraspasos />;
      case 'movimientos':
        return <MovimientosMenu onNavigate={navegarA} />;
      case 'calendario':
        return <Calendario selectedClub={clubSeleccionado} selectedSeason={temporadaActual} onSeasonChange={setTemporadaActual} />;
      case 'reportes':
        return <ReportesMenu onNavigate={navegarA} />;
      case 'reporte-iva':
        return <Reportes tipoReporte="iva" selectedClub={clubSeleccionado} selectedSeason={temporadaActual} temporadas={temporadas} clubName={clubActivo?.nombre || 'Todos los clubs'} clubEscudo={clubActivo?.escudo_url} onSeasonChange={setTemporadaActual} onNavigate={navegarA} />;
      case 'reporte-balance':
        return <Reportes tipoReporte="balance" selectedClub={clubSeleccionado} selectedSeason={temporadaActual} temporadas={temporadas} clubName={clubActivo?.nombre || 'Todos los clubs'} clubEscudo={clubActivo?.escudo_url} onSeasonChange={setTemporadaActual} onNavigate={navegarA} />;
      case 'reporte-cuenta':
        return <Reportes tipoReporte="cuenta" selectedClub={clubSeleccionado} selectedSeason={temporadaActual} temporadas={temporadas} clubName={clubActivo?.nombre || 'Todos los clubs'} clubEscudo={clubActivo?.escudo_url} onSeasonChange={setTemporadaActual} onNavigate={navegarA} />;
      case 'cuentas-bancarias':
        return <CuentasBancarias selectedClub={clubSeleccionado} selectedSeason={temporadaActual} />;
      default:
        return <Dashboard onNavigate={navegarA} selectedClub={clubSeleccionado} selectedSeason={temporadaActual} />;
    }
  };

  const paginaActual = (() => {
    switch (location.pathname) {
      case '/clubes': return 'clubes';
      case '/validacion-clubes': return 'validacion-clubes';
      case '/jugadores': return 'jugadores';
      case '/ingresos': return 'ingresos';
      case '/egresos': return 'egresos';
      case '/traspasos': return 'traspasos';
      case '/movimientos': return 'movimientos';
      case '/calendario': return 'calendario';
      case '/reportes': return 'reportes';
      case '/reporte-iva': return 'reporte-iva';
      case '/reporte-balance': return 'reporte-balance';
      case '/reporte-cuenta': return 'reporte-cuenta';
      case '/cuentas-bancarias': return 'cuentas-bancarias';
      case '/dashboard':
      case '/':
      default:
        return 'dashboard';
    }
  })();

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>⚽ Club de Fútbol - Sistema de Gestión</h1>
          {usuario && (
            <div className="user-menu-wrapper">
              <div className="user-controls">
                <select
                  className="club-selector"
                  value={temporadaActual}
                  onChange={(e) => setTemporadaActual(e.target.value)}
                  title="Temporada actual"
                >
                  {(temporadas.length > 0 ? temporadas.map((temporada) => temporada.nombre) : temporadasDisponibles()).map((temporada) => (
                    <option key={temporada} value={temporada}>
                      Temporada {temporada}
                    </option>
                  ))}
                </select>

                {(esAdminGlobal || clubActual) && (
                  <>
                    <div className="club-badge-inline">
                      {clubActivo?.escudo_url && (
                        <img src={clubActivo.escudo_url} alt={`${clubActivo.nombre || 'Club'} escudo`} className="club-badge-thumb" />
                      )}
                      <span>{clubActivo ? clubActivo.nombre : 'Todos los clubs'}</span>
                    </div>

                    {esAdminGlobal && (
                      <select
                        className="club-selector"
                        value={clubSeleccionado}
                        onChange={(e) => cambiarClub(e.target.value)}
                      >
                        <option value="all">Todos los clubs</option>
                        {clubes.map((club) => (
                          <option key={club.id} value={String(club.id)}>
                            {club.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}

                <button
                  className="user-admin-button"
                  onClick={() => setMenuAdminAbierto((prev) => !prev)}
                >
                  👤 {usuario.nombre}
                </button>
              </div>

              {menuAdminAbierto && (
                <div className="admin-menu">
                  <button className="profile-option" onClick={() => {
                    setPerfilAbierto((prev) => !prev);
                    setPerfilError('');
                    setPerfilSuccess('');
                  }}>
                    ✏️ Editar perfil
                  </button>

                  {perfilAbierto && (
                    <div className="perfil-form-box">
                      {clubActual?.escudo_url && (
                        <div className="club-profile-card">
                          <img src={clubActual.escudo_url} alt={`${clubActual.nombre || 'Club'} escudo`} className="club-profile-image" />
                          <div>
                            <span className="club-profile-label">Club</span>
                            <strong>{clubActual.nombre || 'Club'}</strong>
                          </div>
                        </div>
                      )}

                      <label>
                        Nombre
                        <input
                          type="text"
                          value={perfilForm.nombre}
                          onChange={(e) => setPerfilForm({ ...perfilForm, nombre: e.target.value })}
                        />
                      </label>

                      <label>
                        Email
                        <input
                          type="email"
                          value={perfilForm.email}
                          disabled={esAdminGlobal}
                          onChange={(e) => setPerfilForm({ ...perfilForm, email: e.target.value })}
                        />
                      </label>

                      <label>
                        Nueva contraseña
                        <input
                          type="password"
                          value={perfilForm.password}
                          placeholder="Opcional"
                          onChange={(e) => setPerfilForm({ ...perfilForm, password: e.target.value })}
                        />
                      </label>

                      {(usuario?.rol !== 'admin' || usuario?.email !== 'admin@club.com') && (
                        <label>
                          URL del escudo del club
                          <input
                            type="url"
                            value={perfilForm.escudo_url}
                            placeholder="https://example.com/escudo.png"
                            onChange={(e) => setPerfilForm({ ...perfilForm, escudo_url: e.target.value })}
                          />
                        </label>
                      )}

                      {perfilError && <div className="perfil-message error">{perfilError}</div>}
                      {perfilSuccess && <div className="perfil-message success">{perfilSuccess}</div>}

                      <div className="perfil-actions">
                        <button className="primary-button" onClick={guardarPerfil}>Guardar</button>
                        <button className="secondary-button" onClick={() => {
                          setPerfilAbierto(false);
                          setPerfilError('');
                          setPerfilSuccess('');
                        }}>Cancelar</button>
                      </div>
                    </div>
                  )}

                  {esAdminGlobal && (
                    <button onClick={() => {
                      navigate('/validacion-clubes');
                      setMenuAdminAbierto(false);
                    }}>
                      ✅ Validar clubs
                    </button>
                  )}

                  {esAdminGlobal && (
                    <>
                      <button onClick={() => {
                        setTemporadaForm({
                          nombre: '',
                          anio_inicio: '',
                          anio_fin: '',
                          fecha_inicio: '',
                          fecha_fin: '',
                          activo: true
                        });
                        setTemporadaFormError('');
                        setTemporadaFormSuccess('');
                        setTemporadaFormAbierto(true);
                      }}>
                        ➕ Agregar nueva temporada
                      </button>

                      {temporadaFormAbierto && (
                        <div className="temporada-form-box">
                          <label>
                            Nombre
                            <input
                              type="text"
                              value={temporadaForm.nombre}
                              onChange={(e) => setTemporadaForm({ ...temporadaForm, nombre: e.target.value })}
                              placeholder="2026/27"
                            />
                          </label>

                          <div className="temporada-grid">
                            <label>
                              Año inicio
                              <input
                                type="number"
                                value={temporadaForm.anio_inicio}
                                onChange={(e) => setTemporadaForm({ ...temporadaForm, anio_inicio: e.target.value })}
                              />
                            </label>

                            <label>
                              Año fin
                              <input
                                type="number"
                                value={temporadaForm.anio_fin}
                                onChange={(e) => setTemporadaForm({ ...temporadaForm, anio_fin: e.target.value })}
                              />
                            </label>
                          </div>

                          <div className="temporada-grid">
                            <label>
                              Fecha inicio
                              <input
                                type="date"
                                value={temporadaForm.fecha_inicio}
                                onChange={(e) => setTemporadaForm({ ...temporadaForm, fecha_inicio: e.target.value })}
                              />
                            </label>

                            <label>
                              Fecha fin
                              <input
                                type="date"
                                value={temporadaForm.fecha_fin}
                                onChange={(e) => setTemporadaForm({ ...temporadaForm, fecha_fin: e.target.value })}
                              />
                            </label>
                          </div>

                          <label className="checkbox-row">
                            <input
                              type="checkbox"
                              checked={temporadaForm.activo}
                              onChange={(e) => setTemporadaForm({ ...temporadaForm, activo: e.target.checked })}
                            />
                            Activa
                          </label>

                          {temporadaFormError && <div className="perfil-message error">{temporadaFormError}</div>}
                          {temporadaFormSuccess && <div className="perfil-message success">{temporadaFormSuccess}</div>}

                          <div className="perfil-actions">
                            <button className="primary-button" onClick={guardarTemporada}>Guardar temporada</button>
                            <button className="secondary-button" onClick={() => {
                              setTemporadaFormAbierto(false);
                              setTemporadaFormError('');
                              setTemporadaFormSuccess('');
                            }}>Cerrar</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <button className="logout-option" onClick={() => {
                    logout();
                    setMenuAdminAbierto(false);
                    setPerfilAbierto(false);
                    setTemporadaFormAbierto(false);
                    localStorage.removeItem('clubSeleccionado');
                    setClubSeleccionado('all');
                  }}>
                    🚪 Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <ul className="nav-menu">
          <li>
            <button 
              className={`nav-link ${paginaActual === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              📊 Dashboard
            </button>
          </li>
          {esAdminGlobal && (
            <li>
              <button 
                className={`nav-link ${paginaActual === 'clubes' ? 'active' : ''}`}
                onClick={() => navigate('/clubes')}
              >
                🏟️ Clubes
              </button>
            </li>
          )}
          <li>
            <button 
              className={`nav-link ${paginaActual === 'jugadores' ? 'active' : ''}`}
              onClick={() => navigate('/jugadores')}
            >
              👥 Jugadores
            </button>
          </li>
          <li>
            <button 
              className={`nav-link ${paginaActual === 'calendario' ? 'active' : ''}`}
              onClick={() => navigate('/calendario')}
            >
              📅 Calendario
            </button>
          </li>
          <li>
            <button 
              className={`nav-link ${['movimientos', 'ingresos', 'egresos', 'traspasos'].includes(paginaActual) ? 'active' : ''}`}
              onClick={() => navigate('/movimientos')}
            >
              💳 Movimientos
            </button>
          </li>
          <li>
            <button 
              className={`nav-link ${['reportes', 'reporte-iva', 'reporte-balance', 'reporte-cuenta'].includes(paginaActual) ? 'active' : ''}`}
              onClick={() => navigate('/reportes')}
            >
              📈 Reportes
            </button>
          </li>
          <li>
            <button 
              className={`nav-link ${paginaActual === 'cuentas-bancarias' ? 'active' : ''}`}
              onClick={() => navigate('/cuentas-bancarias')}
            >
              🏦 Cuentas
            </button>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={renderPagina('dashboard')} />
          <Route path="/clubes" element={renderPagina('clubes')} />
          <Route path="/validacion-clubes" element={renderPagina('validacion-clubes')} />
          <Route path="/jugadores" element={renderPagina('jugadores')} />
          <Route path="/ingresos" element={renderPagina('ingresos')} />
          <Route path="/egresos" element={renderPagina('egresos')} />
          <Route path="/traspasos" element={renderPagina('traspasos')} />
          <Route path="/movimientos" element={renderPagina('movimientos')} />
          <Route path="/calendario" element={renderPagina('calendario')} />
          <Route path="/reportes" element={renderPagina('reportes')} />
          <Route path="/reporte-iva" element={renderPagina('reporte-iva')} />
          <Route path="/reporte-balance" element={renderPagina('reporte-balance')} />
          <Route path="/reporte-cuenta" element={renderPagina('reporte-cuenta')} />
          <Route path="/cuentas-bancarias" element={renderPagina('cuentas-bancarias')} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>&copy; 2026 Sistema de Gestión de Club. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppContent />
      </ProtectedRoute>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </AuthProvider>
  );
}

export default App;
