import express from 'express';
import pool from '../config/database.js';
import { normalizarEscudoUrl } from '../utils/normalizarEscudoUrl.js';

const router = express.Router();

const ESTADOS_CLUB = ['Pendiente', 'Activo', 'Rechazado', 'Inactivo'];

const isAdmin = (req) => req.user?.rol === 'admin' && String(req.user?.email || '').trim().toLowerCase() === 'admin@club.com';

const normalizarEstadoClub = (estado) => {
  const valor = String(estado ?? '').trim();
  return ESTADOS_CLUB.includes(valor) ? valor : 'Pendiente';
};

router.get('/pendientes', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Solo un administrador puede validar clubs' });
    }

    const [rows] = await pool.query('SELECT * FROM clubes WHERE estado = ? ORDER BY fecha_creacion DESC', ['Pendiente']);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    if (isAdmin(req)) {
      const clubIdSeleccionado = Number(req.query.clubId || req.query.club_id);
      if (clubIdSeleccionado) {
        const [rows] = await pool.query('SELECT * FROM clubes WHERE id = ? ORDER BY nombre ASC', [clubIdSeleccionado]);
        return res.json(rows);
      }

      const [rows] = await pool.query('SELECT * FROM clubes ORDER BY nombre ASC');
      return res.json(rows);
    }

    const clubId = req.user?.club_id;
    if (!clubId) {
      return res.json([]);
    }

    const [rows] = await pool.query('SELECT * FROM clubes WHERE id = ? ORDER BY nombre ASC', [clubId]);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Solo un administrador puede registrar clubs' });
    }

    const { nombre, ciudad, liga, estadio, presupuesto, estado, escudo_url } = req.body;

    if (!nombre || !ciudad || !liga || !estadio || !presupuesto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const escudoNormalizado = normalizarEscudoUrl(escudo_url);

    const [result] = await pool.query(
      'INSERT INTO clubes (nombre, ciudad, liga, estadio, presupuesto, escudo_url, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, ciudad, liga, estadio, presupuesto, escudoNormalizado || null, estado || 'Pendiente']
    );

    return res.status(201).json({
      id: result.insertId,
      nombre,
      ciudad,
      liga,
      estadio,
      presupuesto,
      escudo_url: escudoNormalizado || null,
      estado: estado || 'Pendiente'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const clubId = Number(req.params.id);
    if (!clubId) {
      return res.status(400).json({ error: 'ID de club no válido' });
    }

    const isOwner = req.user?.club_id && Number(req.user.club_id) === clubId;
    if (!isAdmin(req) && !isOwner) {
      return res.status(403).json({ error: 'No puedes editar un club ajeno' });
    }

    const { nombre, ciudad, liga, estadio, presupuesto, estado, escudo_url } = req.body;

    if (!nombre || !ciudad || !liga || !estadio || !presupuesto) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const escudoNormalizado = normalizarEscudoUrl(escudo_url);
    const nuevoEstado = normalizarEstadoClub(estado || 'Pendiente');
    const presupuestoNumero = Number(presupuesto);

    if (Number.isNaN(presupuestoNumero) || presupuestoNumero <= 0) {
      return res.status(400).json({ error: 'El presupuesto debe ser un número mayor que 0.' });
    }

    const [result] = await pool.query(
      'UPDATE clubes SET nombre = ?, ciudad = ?, liga = ?, estadio = ?, presupuesto = ?, escudo_url = ?, estado = ? WHERE id = ?',
      [nombre, ciudad, liga, estadio, presupuestoNumero, escudoNormalizado || null, nuevoEstado, clubId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }

    const [rows] = await pool.query('SELECT * FROM clubes WHERE id = ? LIMIT 1', [clubId]);
    return res.json({ mensaje: 'Club actualizado correctamente', club: rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/estado', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Solo un administrador puede cambiar el estado del club' });
    }

    const clubId = Number(req.params.id);
    if (!clubId) {
      return res.status(400).json({ error: 'ID de club no válido' });
    }

    const nuevoEstado = normalizarEstadoClub(req.body?.estado);
    if (!ESTADOS_CLUB.includes(nuevoEstado)) {
      return res.status(400).json({ error: 'Estado de club no válido' });
    }

    const [result] = await pool.query('UPDATE clubes SET estado = ? WHERE id = ?', [nuevoEstado, clubId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }

    const [rows] = await pool.query('SELECT * FROM clubes WHERE id = ? LIMIT 1', [clubId]);
    return res.json({ mensaje: 'Estado del club actualizado correctamente', club: rows[0], estado: nuevoEstado });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/validar', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Solo un administrador puede validar clubs' });
    }

    const clubId = Number(req.params.id);
    if (!clubId) {
      return res.status(400).json({ error: 'ID de club no válido' });
    }

    const nuevoEstado = normalizarEstadoClub(req.body?.estado || 'Activo');
    const [result] = await pool.query('UPDATE clubes SET estado = ? WHERE id = ?', [nuevoEstado, clubId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }

    const [rows] = await pool.query('SELECT * FROM clubes WHERE id = ? LIMIT 1', [clubId]);
    return res.json({ mensaje: 'Club validado correctamente', club: rows[0], estado: nuevoEstado });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = Number(id);

    if (!isAdmin(req) && req.user?.club_id && clubId !== Number(req.user.club_id)) {
      return res.status(403).json({ error: 'No puedes eliminar un club ajeno' });
    }

    await pool.query('DELETE FROM clubes WHERE id = ?', [clubId]);
    return res.json({ mensaje: 'Club eliminado exitosamente' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
