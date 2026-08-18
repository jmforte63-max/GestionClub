import pool from '../config/database.js';

const getClubId = (req) => Number(req.user?.club_id ?? 0);
const canSeeAllClubs = (req) => req.user?.rol === 'admin' && String(req.user?.email || '').trim().toLowerCase() === 'admin@club.com';
const getSelectedClubId = (req) => {
  const raw = req.query?.clubId ?? req.query?.club_id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getTemporada = (req) => {
  const raw = req.query?.temporada ?? req.query?.season ?? req.body?.temporada ?? req.body?.season;
  return raw !== undefined && raw !== null && String(raw).trim() !== '' ? String(raw).trim() : null;
};

const resolveTemporada = (req, fecha) => {
  const raw = req.body?.temporada ?? req.query?.temporada ?? req.body?.season ?? req.query?.season;
  const temporada = raw !== undefined && raw !== null && String(raw).trim() !== '' ? String(raw).trim() : null;
  if (temporada) return temporada;

  if (fecha) {
    const fechaObj = new Date(`${fecha}T00:00:00`);
    if (!Number.isNaN(fechaObj.getTime())) {
      const anio = fechaObj.getFullYear();
      return fechaObj.getMonth() >= 6 ? `${anio}/${String(anio + 1).slice(-2)}` : `${anio - 1}/${String(anio).slice(-2)}`;
    }
  }

  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const temporadaBase = ahora.getMonth() >= 6 ? anioActual : anioActual - 1;
  return `${temporadaBase}/${String(temporadaBase + 1).slice(-2)}`;
};

export const getEventos = async (req, res) => {
  try {
    const clubId = getClubId(req);
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const targetClubId = selectedClubId ?? clubId;
    const temporada = getTemporada(req);
    const conditions = [];
    const params = [];

    if (selectedClubId !== null || !canSeeAllClubs(req)) {
      conditions.push('club_id = ?');
      params.push(targetClubId);
    }

    if (temporada) {
      conditions.push('temporada = ?');
      params.push(temporada);
    }

    const query = conditions.length > 0
      ? `SELECT * FROM eventos WHERE ${conditions.join(' AND ')} ORDER BY fecha DESC, hora DESC`
      : 'SELECT * FROM eventos ORDER BY fecha DESC, hora DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearEvento = async (req, res) => {
  try {
    const { fecha, hora, tipo, descripcion, ubicacion } = req.body;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const temporadaFinal = resolveTemporada(req, fecha);

    if (!clubId || !fecha || !hora || !tipo || !descripcion) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const [result] = await pool.query(
      'INSERT INTO eventos (club_id, fecha, hora, tipo, descripcion, ubicacion, temporada) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [clubId, fecha, hora, tipo, descripcion, ubicacion || null, temporadaFinal]
    );

    res.status(201).json({
      id: result.insertId,
      mensaje: 'Evento creado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerEvento = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const [rows] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT * FROM eventos WHERE id = ? AND club_id = ?'
        : 'SELECT * FROM eventos WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarEvento = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora, tipo, descripcion, ubicacion } = req.body;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const temporadaFinal = resolveTemporada(req, fecha);

    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'UPDATE eventos SET fecha = ?, hora = ?, tipo = ?, descripcion = ?, ubicacion = ?, temporada = ? WHERE id = ? AND club_id = ?'
        : 'UPDATE eventos SET fecha = ?, hora = ?, tipo = ?, descripcion = ?, ubicacion = ?, temporada = ? WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [fecha, hora, tipo, descripcion, ubicacion || null, temporadaFinal, id, clubId] : [fecha, hora, tipo, descripcion, ubicacion || null, temporadaFinal, id]
    );

    res.json({ mensaje: 'Evento actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarEvento = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'DELETE FROM eventos WHERE id = ? AND club_id = ?'
        : 'DELETE FROM eventos WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );
    res.json({ mensaje: 'Evento eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
