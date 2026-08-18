import pool from '../config/database.js';

const getClubId = (req) => Number(req.user?.club_id ?? 0);
const canSeeAllClubs = (req) => req.user?.rol === 'admin' && String(req.user?.email || '').trim().toLowerCase() === 'admin@club.com';
const getSelectedClubId = (req) => {
  const raw = req.query?.clubId ?? req.query?.club_id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const getJugadores = async (req, res) => {
  try {
    const clubId = getClubId(req);
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const targetClubId = selectedClubId ?? clubId;
    const query = selectedClubId !== null || !canSeeAllClubs(req)
      ? 'SELECT * FROM jugadores WHERE club_id = ? ORDER BY numero ASC'
      : 'SELECT * FROM jugadores ORDER BY numero ASC';
    const params = selectedClubId !== null || !canSeeAllClubs(req) ? [targetClubId] : [];
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearJugador = async (req, res) => {
  try {
    const { nombre, posicion, numero, estado } = req.body;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);

    if (!clubId || !nombre || !posicion || !numero) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const [result] = await pool.query(
      'INSERT INTO jugadores (club_id, nombre, posicion, numero, estado) VALUES (?, ?, ?, ?, ?)',
      [clubId, nombre, posicion, numero, estado || 'Activo']
    );

    res.status(201).json({
      id: result.insertId,
      mensaje: 'Jugador creado exitosamente'
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El número ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const obtenerJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const [rows] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT * FROM jugadores WHERE id = ? AND club_id = ?'
        : 'SELECT * FROM jugadores WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, posicion, numero, estado } = req.body;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);

    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'UPDATE jugadores SET nombre = ?, posicion = ?, numero = ?, estado = ? WHERE id = ? AND club_id = ?'
        : 'UPDATE jugadores SET nombre = ?, posicion = ?, numero = ?, estado = ? WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [nombre, posicion, numero, estado, id, clubId] : [nombre, posicion, numero, estado, id]
    );

    res.json({ mensaje: 'Jugador actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'DELETE FROM jugadores WHERE id = ? AND club_id = ?'
        : 'DELETE FROM jugadores WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );
    res.json({ mensaje: 'Jugador eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
