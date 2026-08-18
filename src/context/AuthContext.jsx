import { createContext, useState, useEffect } from 'react';
import { apiUrl } from '../api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario');
    const tokenGuardado = localStorage.getItem('token');

    if (usuarioGuardado && tokenGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
    }

    setCargando(false);
  }, []);

  const guardarSesion = (usuarioLogueado, token) => {
    localStorage.setItem('usuario', JSON.stringify(usuarioLogueado));
    localStorage.setItem('token', token);
    setUsuario(usuarioLogueado);
  };

  const login = async (email, password) => {
    if (!email || !password) {
      return { success: false, error: 'Email y contraseña requeridos' };
    }

    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        return {
          success: false,
          error: data.error || 'Credenciales inválidas',
        };
      }

      const usuarioLogueado = data.usuario;
      guardarSesion(usuarioLogueado, data.token);

      return { success: true, usuario: usuarioLogueado };
    } catch (error) {
      return {
        success: false,
        error: 'No se pudo conectar con el servidor',
      };
    }
  };

  const register = async (datosRegistro) => {
    if (!datosRegistro?.email || !datosRegistro?.password || !datosRegistro?.nombre) {
      return { success: false, error: 'Nombre, email y contraseña son obligatorios' };
    }

    try {
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosRegistro),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'No se pudo registrar el club',
        };
      }

      return {
        success: true,
        message: data.message || 'Club registrado correctamente.',
        club: data.club,
      };
    } catch (error) {
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para registrar el club',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    setUsuario(null);
  };

  const updateProfile = async (datosPerfil) => {
    if (!usuario || !usuario.id) {
      return { success: false, error: 'No hay sesión activa' };
    }

    try {
      const response = await fetch(apiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(datosPerfil),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'No se pudo actualizar el perfil',
        };
      }

      guardarSesion(data.usuario, data.token);
      return { success: true, usuario: data.usuario };
    } catch (error) {
      return {
        success: false,
        error: 'No se pudo conectar con el servidor para actualizar el perfil',
      };
    }
  };

  const estaAutenticado = () => usuario !== null;

  return (
    <AuthContext.Provider value={{ usuario, login, register, logout, updateProfile, estaAutenticado, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}
