import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import '../styles/Login.css';

const initialForm = {
  nombre: '',
  email: '',
  password: '',
  clubNombre: '',
  ciudad: '',
  liga: '',
  estadio: '',
  presupuesto: '',
  escudo_url: '',
};

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [modo, setModo] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    let resultado;

    if (modo === 'login') {
      resultado = await login(form.email, form.password);
      if (resultado.success) {
        toast.success(`¡Bienvenido ${resultado.usuario.nombre}!`);
        navigate('/dashboard');
      }
    } else {
      resultado = await register({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        clubNombre: form.clubNombre,
        ciudad: form.ciudad,
        liga: form.liga,
        estadio: form.estadio,
        presupuesto: form.presupuesto,
        escudo_url: form.escudo_url,
      });

      if (resultado.success) {
        toast.success(resultado.message || 'Club registrado correctamente. Pendiente de validación.');
      }
    }

    if (!resultado.success) {
      toast.error(resultado.error);
    } else {
      setForm(initialForm);
    }

    setCargando(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>⚽ Sistema de Gestión</h1>
          <p>Club de Fútbol</p>
        </div>

        {modo === 'register' && form.escudo_url && (
          <div className="club-preview-card">
            <img src={form.escudo_url} alt="Escudo del club" className="club-preview-image" />
            <div>
              <span className="club-preview-label">Club</span>
              <strong>{form.clubNombre || 'Equipo sin nombre'}</strong>
            </div>
          </div>
        )}

        <div className="auth-toggle">
          <button
            type="button"
            className={modo === 'login' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => setModo('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={modo === 'register' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => setModo('register')}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {modo === 'register' && (
            <>
              <div className="form-group">
                <label>Tu nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              <div className="form-group">
                <label>Nombre del club</label>
                <input
                  type="text"
                  name="clubNombre"
                  value={form.clubNombre}
                  onChange={handleChange}
                  placeholder="Club Deportivo Norte"
                  required
                />
              </div>

              <div className="form-group">
                <label>Ciudad</label>
                <input
                  type="text"
                  name="ciudad"
                  value={form.ciudad}
                  onChange={handleChange}
                  placeholder="Sevilla"
                  required
                />
              </div>

              <div className="form-group">
                <label>Liga</label>
                <input
                  type="text"
                  name="liga"
                  value={form.liga}
                  onChange={handleChange}
                  placeholder="LaLiga"
                  required
                />
              </div>

              <div className="form-group">
                <label>Estadio</label>
                <input
                  type="text"
                  name="estadio"
                  value={form.estadio}
                  onChange={handleChange}
                  placeholder="Estadio Municipal"
                  required
                />
              </div>

              <div className="form-group">
                <label>Presupuesto inicial (€)</label>
                <input
                  type="number"
                  name="presupuesto"
                  value={form.presupuesto}
                  onChange={handleChange}
                  placeholder="150000"
                  required
                />
              </div>

              <div className="form-group">
                <label>URL del escudo del equipo</label>
                <input
                  type="url"
                  name="escudo_url"
                  value={form.escudo_url}
                  onChange={handleChange}
                  placeholder="https://example.com/escudo.png"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Tu contraseña"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={cargando}>
            {cargando
              ? (modo === 'login' ? 'Iniciando sesión...' : 'Registrando club...')
              : (modo === 'login' ? 'Iniciar Sesión' : 'Registrar mi club')}
          </button>
        </form>

        <div className="login-info">
          <p>
            {modo === 'login'
              ? '💡 Si eres nuevo, regístrate desde aquí con tu club.'
              : '💡 Registra tu club y crea la cuenta del administrador del club.'}
          </p>
        </div>

        <div className="login-features">
          <h3>Características disponibles:</h3>
          <ul>
            <li>✓ Registro propio del club</li>
            <li>✓ Gestión de ingresos y gastos</li>
            <li>✓ Control de jugadores y calendario</li>
            <li>✓ Acceso por club y usuario</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
