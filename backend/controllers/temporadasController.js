import pool from '../config/database.js';

const isAdminGlobal = (req) => req.user?.rol === 'admin' && String(req.user?.email || '').trim().toLowerCase() === 'admin@club.com';

export const getTemporadas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, anio_inicio, anio_fin, fecha_inicio, fecha_fin, activo FROM temporadas ORDER BY fecha_inicio DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearTemporada = async (req, res) => {
  try {
    if (!isAdminGlobal(req)) {
      return res.status(403).json({ error: 'Solo el administrador puede crear temporadas' });
    }

    const { nombre, anio_inicio, anio_fin, fecha_inicio, fecha_fin, activo = true } = req.body || {};

    const nombreFinal = String(nombre || '').trim();
    if (!nombreFinal) {
      return res.status(400).json({ error: 'El nombre de la temporada es obligatorio' });
    }

    const fechaInicioInput = String(fecha_inicio || '').trim();
    const fechaFinInput = String(fecha_fin || '').trim();

    const anioInicioNumber = Number(anio_inicio);
    const anioFinNumber = Number(anio_fin);

    const anioInicioFinal = Number.isFinite(anioInicioNumber) && anioInicioNumber > 0
      ? anioInicioNumber
      : (fechaInicioInput ? new Date(`${fechaInicioInput}T00:00:00`).getFullYear() : null);

    const anioFinFinal = Number.isFinite(anioFinNumber) && anioFinNumber > 0
      ? anioFinNumber
      : (fechaFinInput ? new Date(`${fechaFinInput}T00:00:00`).getFullYear() : null);

    const fechaInicio = fechaInicioInput || (anioInicioFinal ? `${anioInicioFinal}-07-01` : null);
    const fechaFin = fechaFinInput || (anioFinFinal ? `${anioFinFinal}-06-30` : null);

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Debes indicar una fecha de inicio y fin o al menos el año de la temporada' });
    }

    const [existing] = await pool.query('SELECT id FROM temporadas WHERE nombre = ? LIMIT 1', [nombreFinal]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya existe esa temporada' });
    }

    const [result] = await pool.query(
      'INSERT INTO temporadas (nombre, anio_inicio, anio_fin, fecha_inicio, fecha_fin, activo) VALUES (?, ?, ?, ?, ?, ?)',
      [nombreFinal, Number(anioInicioFinal), Number(anioFinFinal), fechaInicio, fechaFin, activo ? 1 : 0]
    );

    const [rows] = await pool.query('SELECT * FROM temporadas WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'No se pudo crear la temporada' });
  }
};

export const getTemporadaPorNombre = async (nombre) => {
  const [rows] = await pool.query('SELECT * FROM temporadas WHERE nombre = ? LIMIT 1', [String(nombre).trim()]);
  return rows[0] || null;
};

export const getTemporadaPorId = async (id) => {
  const [rows] = await pool.query('SELECT * FROM temporadas WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};
