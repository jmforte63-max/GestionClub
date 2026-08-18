import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { normalizarEscudoUrl } from '../utils/normalizarEscudoUrl.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'club-secret-key';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

router.post('/register', async (req, res) => {
  try {
    const {
      nombre,
      email,
      password,
      clubNombre,
      ciudad,
      liga,
      estadio,
      presupuesto,
      escudo_url
    } = req.body || {};

    if (!nombre || !email || !password || !clubNombre || !ciudad || !liga || !estadio || !presupuesto) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios para registrar tu club' });
    }

    const escudoNormalizado = normalizarEscudoUrl(escudo_url);

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existingUsers] = await pool.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [normalizedEmail]);

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const [clubResult] = await pool.query(
      'INSERT INTO clubes (nombre, ciudad, liga, estadio, presupuesto, escudo_url, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [String(clubNombre).trim(), String(ciudad).trim(), String(liga).trim(), String(estadio).trim(), Number(presupuesto), escudoNormalizado || null, 'Pendiente']
    );

    const clubId = clubResult.insertId;
    const hashedPassword = await bcrypt.hash(String(password), 10);

    await pool.query(
      'INSERT INTO usuarios (email, nombre, password, rol, club_id, activo) VALUES (?, ?, ?, ?, ?, ?)',
      [normalizedEmail, String(nombre).trim(), hashedPassword, 'usuario', clubId, true]
    );

    return res.status(201).json({
      message: 'Club registrado correctamente. Está pendiente de validación por el administrador.',
      club: {
        id: clubId,
        nombre: String(clubNombre).trim(),
        ciudad: String(ciudad).trim(),
        liga: String(liga).trim(),
        estadio: String(estadio).trim(),
        presupuesto: Number(presupuesto),
        escudo_url: escudoNormalizado || null,
        estado: 'Pendiente'
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ error: 'No se pudo registrar el club. Revisa los datos o la conexión a la base de datos.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [rows] = await pool.query(
      'SELECT id, email, nombre, password, rol, club_id FROM usuarios WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    const usuario = rows[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (usuario.club_id) {
      const [clubRows] = await pool.query('SELECT estado FROM clubes WHERE id = ? LIMIT 1', [usuario.club_id]);
      const clubEstado = clubRows[0]?.estado;

      if (clubEstado && clubEstado !== 'Activo') {
        const mensajesPorEstado = {
          Inactivo: 'Tu club está pendiente de pago. Contacta con el administrador.',
          Pendiente: 'Tu club está pendiente de validación por el administrador.',
          Rechazado: 'Tu club ha sido rechazado. Contacta con el administrador.',
        };

        return res.status(403).json({ error: mensajesPorEstado[clubEstado] || 'Tu club no tiene acceso activo en este momento.' });
      }
    }

    let passwordValida = false;

    if (usuario.password && usuario.password.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, usuario.password);
    } else {
      passwordValida = String(password) === String(usuario.password);
    }

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      club_id: usuario.club_id
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    return res.json({
      message: 'Inicio de sesión correcto',
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        club_id: usuario.club_id
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, nombre, rol, club_id FROM usuarios WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({ usuario: rows[0] });
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { nombre, email, password, escudo_url } = req.body || {};
    const userId = req.user.id;

    const [rows] = await pool.query(
      'SELECT id, email, nombre, password, rol, club_id FROM usuarios WHERE id = ? LIMIT 1',
      [userId]
    );

    const usuarioActual = rows[0];
    if (!usuarioActual) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const nombreFinal = String(nombre || usuarioActual.nombre).trim();
    if (!nombreFinal) {
      return res.status(400).json({ error: 'El nombre no puede estar vacío' });
    }

    let emailFinal = usuarioActual.email;
    const esAdminGlobal = usuarioActual.rol === 'admin' && usuarioActual.email === 'admin@club.com';

    if (!esAdminGlobal && email) {
      const emailNormalizado = String(email).trim().toLowerCase();
      if (!emailNormalizado) {
        return res.status(400).json({ error: 'El email no puede estar vacío' });
      }

      const [existentes] = await pool.query(
        'SELECT id FROM usuarios WHERE email = ? AND id != ? LIMIT 1',
        [emailNormalizado, userId]
      );

      if (existentes.length > 0) {
        return res.status(409).json({ error: 'Ya existe otra cuenta con ese email' });
      }

      emailFinal = emailNormalizado;
    }

    let nuevaPassword = usuarioActual.password;
    if (password && String(password).trim()) {
      nuevaPassword = await bcrypt.hash(String(password).trim(), 10);
    }

    const escudoNormalizado = normalizarEscudoUrl(escudo_url);

    await pool.query(
      'UPDATE usuarios SET nombre = ?, email = ?, password = ? WHERE id = ?',
      [nombreFinal, emailFinal, nuevaPassword, userId]
    );

    if (usuarioActual.club_id) {
      await pool.query(
        'UPDATE clubes SET escudo_url = ? WHERE id = ?',
        [escudoNormalizado || null, usuarioActual.club_id]
      );
    }

    const payload = {
      id: usuarioActual.id,
      email: emailFinal,
      nombre: nombreFinal,
      rol: usuarioActual.rol,
      club_id: usuarioActual.club_id
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    return res.json({
      message: 'Perfil actualizado correctamente',
      token,
      usuario: {
        id: usuarioActual.id,
        email: emailFinal,
        nombre: nombreFinal,
        rol: usuarioActual.rol,
        club_id: usuarioActual.club_id
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el perfil' });
  }
});

export default router;
