import pool from '../config/database.js';

const getClubId = (req) => Number(req.user?.club_id ?? 0);
const canSeeAllClubs = (req) => req.user?.rol === 'admin' && String(req.user?.email || '').trim().toLowerCase() === 'admin@club.com';
const getSelectedClubId = (req) => {
  const raw = req.query?.clubId ?? req.query?.club_id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const getConceptosEgresos = async (req, res) => {
  try {
    const clubId = getClubId(req);
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const targetClubId = selectedClubId ?? clubId;

    const query = selectedClubId !== null || !canSeeAllClubs(req)
      ? 'SELECT * FROM conceptos_egresos WHERE club_id = ? AND activo = TRUE ORDER BY nombre ASC'
      : 'SELECT * FROM conceptos_egresos WHERE activo = TRUE ORDER BY nombre ASC';
    const params = selectedClubId !== null || !canSeeAllClubs(req) ? [targetClubId] : [];

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearConceptoEgreso = async (req, res) => {
  try {
    const { nombre, descripcion, iva, activo = true } = req.body || {};
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);

    if (!clubId || !nombre || iva === undefined || iva === null) {
      return res.status(400).json({ error: 'Faltan datos requeridos: nombre e IVA' });
    }

    const nombreTrim = String(nombre).trim();
    if (!nombreTrim) {
      return res.status(400).json({ error: 'El nombre del concepto no puede estar vacío' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM conceptos_egresos WHERE club_id = ? AND nombre = ? LIMIT 1',
      [clubId, nombreTrim]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya existe un concepto con ese nombre para este club' });
    }

    const [result] = await pool.query(
      'INSERT INTO conceptos_egresos (club_id, nombre, descripcion, iva, activo) VALUES (?, ?, ?, ?, ?)',
      [clubId, nombreTrim, descripcion || null, Number(iva), Boolean(activo)]
    );

    res.status(201).json({
      id: result.insertId,
      club_id: clubId,
      nombre: nombreTrim,
      descripcion: descripcion || null,
      iva: Number(iva),
      activo: Boolean(activo),
      mensaje: 'Concepto de gasto creado correctamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerConceptoEgreso = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);

    const [rows] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT * FROM conceptos_egresos WHERE id = ? AND club_id = ?'
        : 'SELECT * FROM conceptos_egresos WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Concepto no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarConceptoEgreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, iva, activo } = req.body || {};
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);

    const [rows] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT * FROM conceptos_egresos WHERE id = ? AND club_id = ? LIMIT 1'
        : 'SELECT * FROM conceptos_egresos WHERE id = ? LIMIT 1',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Concepto no encontrado' });
    }

    const nombreFinal = nombre ? String(nombre).trim() : rows[0].nombre;
    const descripcionFinal = descripcion !== undefined ? descripcion : rows[0].descripcion;
    const ivaFinal = iva !== undefined ? Number(iva) : Number(rows[0].iva || 0);
    const activoFinal = activo !== undefined ? Boolean(activo) : Boolean(rows[0].activo);

    if (!nombreFinal) {
      return res.status(400).json({ error: 'El nombre del concepto no puede estar vacío' });
    }

    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'UPDATE conceptos_egresos SET nombre = ?, descripcion = ?, iva = ?, activo = ? WHERE id = ? AND club_id = ?'
        : 'UPDATE conceptos_egresos SET nombre = ?, descripcion = ?, iva = ?, activo = ? WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req)
        ? [nombreFinal, descripcionFinal || null, ivaFinal, activoFinal, id, clubId]
        : [nombreFinal, descripcionFinal || null, ivaFinal, activoFinal, id]
    );

    res.json({ mensaje: 'Concepto de gasto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarConceptoEgreso = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);

    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'DELETE FROM conceptos_egresos WHERE id = ? AND club_id = ?'
        : 'DELETE FROM conceptos_egresos WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    res.json({ mensaje: 'Concepto de gasto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
