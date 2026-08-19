import pool from '../config/database.js';
import { getTemporadaPorNombre, getTemporadaPorId } from './temporadasController.js';
import { recalcularSaldosMensuales } from '../utils/recalcularSaldosMensuales.js';

const actualizarSaldoCuentaDesdeMovimiento = async (poolConnection, cuentaId, clubId, delta) => {
  if (!cuentaId || !clubId || !Number.isFinite(Number(delta))) {
    return null;
  }

  const valorDelta = Number(delta);
  const [result] = await poolConnection.query(
    'UPDATE cuentas_bancarias SET saldo = saldo + ? WHERE id = ? AND club_id = ?',
    [valorDelta, cuentaId, clubId]
  );

  return result;
};

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

const parseCuentaId = (valor) => {
  const parsed = Number(valor);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveTemporadaNombre = (req, fecha) => {
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
  return ahora.getMonth() >= 6 ? `${anioActual}/${String(anioActual + 1).slice(-2)}` : `${anioActual - 1}/${String(anioActual).slice(-2)}`;
};

const resolveTemporadaId = async (req, fecha) => {
  const nombre = resolveTemporadaNombre(req, fecha);
  const temporada = await getTemporadaPorNombre(nombre);
  if (temporada) return temporada.id;
  const fallback = await getTemporadaPorId(1);
  return fallback ? fallback.id : 1;
};

export const getIngresos = async (req, res) => {
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
      ? `SELECT * FROM ingresos WHERE ${conditions.join(' AND ')} ORDER BY fecha DESC`
      : 'SELECT * FROM ingresos ORDER BY fecha DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearIngreso = async (req, res) => {
  try {
    const { fecha, concepto, monto, descripcion, iva, total_con_iva, cuenta_id } = req.body;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const temporadaFinal = resolveTemporadaNombre(req, fecha);
    const cuentaId = parseCuentaId(cuenta_id);

    if (!clubId || !fecha || !concepto || !monto || !cuentaId) {
      return res.status(400).json({ error: 'Debes seleccionar una cuenta válida para el ingreso.' });
    }

    const ivaFinal = Number(iva ?? 0);
    const montoBase = Number(monto ?? 0);
    const totalConIvaFinal = Number((montoBase * (1 + (ivaFinal / 100))).toFixed(2));

    const [result] = await pool.query(
      'INSERT INTO ingresos (usuario_id, club_id, fecha, concepto, monto, iva, total_con_iva, descripcion, temporada, cuenta_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, clubId, fecha, concepto, montoBase, ivaFinal, totalConIvaFinal, descripcion || null, temporadaFinal, cuentaId]
    );

    await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, totalConIvaFinal);
    await recalcularSaldosMensuales(clubId);

    res.status(201).json({
      id: result.insertId,
      mensaje: 'Ingreso creado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const [rows] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT * FROM ingresos WHERE id = ? AND club_id = ?'
        : 'SELECT * FROM ingresos WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ingreso no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, concepto, monto, descripcion, iva, total_con_iva, cuenta_id } = req.body;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const temporadaFinal = resolveTemporadaNombre(req, fecha);
    const cuentaId = parseCuentaId(cuenta_id);
    const ivaFinal = Number(iva ?? 0);
    const montoBase = Number(monto ?? 0);
    const totalConIvaFinal = Number((montoBase * (1 + (ivaFinal / 100))).toFixed(2));

    if (!fecha || !concepto || !monto || !cuentaId) {
      return res.status(400).json({ error: 'Debes seleccionar una cuenta válida para el ingreso.' });
    }

    const [movimientoActual] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT cuenta_id, total_con_iva, monto FROM ingresos WHERE id = ? AND club_id = ? LIMIT 1'
        : 'SELECT cuenta_id, total_con_iva, monto FROM ingresos WHERE id = ? LIMIT 1',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    const cuentaAnterior = movimientoActual[0]?.cuenta_id ? Number(movimientoActual[0].cuenta_id) : null;
    const totalAnterior = Number(movimientoActual[0]?.total_con_iva ?? movimientoActual[0]?.monto ?? 0);

    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'UPDATE ingresos SET fecha = ?, concepto = ?, monto = ?, iva = ?, total_con_iva = ?, descripcion = ?, temporada = ?, cuenta_id = ? WHERE id = ? AND club_id = ?'
        : 'UPDATE ingresos SET fecha = ?, concepto = ?, monto = ?, iva = ?, total_con_iva = ?, descripcion = ?, temporada = ?, cuenta_id = ? WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req)
        ? [fecha, concepto, montoBase, ivaFinal, totalConIvaFinal, descripcion || null, temporadaFinal, cuentaId, id, clubId]
        : [fecha, concepto, montoBase, ivaFinal, totalConIvaFinal, descripcion || null, temporadaFinal, cuentaId, id]
    );

    if (cuentaAnterior && cuentaAnterior !== cuentaId) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaAnterior, clubId, -totalAnterior);
    }
    if (cuentaAnterior === cuentaId) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, totalConIvaFinal - totalAnterior);
    } else {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, totalConIvaFinal);
    }

    await recalcularSaldosMensuales(clubId);

    res.json({ mensaje: 'Ingreso actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarIngreso = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const [movimientoActual] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT cuenta_id, total_con_iva, monto FROM ingresos WHERE id = ? AND club_id = ? LIMIT 1'
        : 'SELECT cuenta_id, total_con_iva, monto FROM ingresos WHERE id = ? LIMIT 1',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );
    const cuentaId = movimientoActual[0]?.cuenta_id ? Number(movimientoActual[0].cuenta_id) : null;
    const totalMovimiento = Number(movimientoActual[0]?.total_con_iva ?? movimientoActual[0]?.monto ?? 0);

    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'DELETE FROM ingresos WHERE id = ? AND club_id = ?'
        : 'DELETE FROM ingresos WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    if (cuentaId) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, -totalMovimiento);
    }

    await recalcularSaldosMensuales(clubId);

    res.json({ mensaje: 'Ingreso eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTotalIngresos = async (req, res) => {
  try {
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const temporada = req.query?.temporada || req.query?.season || null;
    const query = temporada
      ? (selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT SUM(COALESCE(total_con_iva, monto)) as total FROM ingresos WHERE club_id = ? AND temporada = ?'
        : 'SELECT SUM(COALESCE(total_con_iva, monto)) as total FROM ingresos WHERE temporada = ?')
      : (selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT SUM(COALESCE(total_con_iva, monto)) as total FROM ingresos WHERE club_id = ?'
        : 'SELECT SUM(COALESCE(total_con_iva, monto)) as total FROM ingresos');
    const params = temporada
      ? (selectedClubId !== null || !canSeeAllClubs(req) ? [clubId, temporada] : [temporada])
      : (selectedClubId !== null || !canSeeAllClubs(req) ? [clubId] : []);
    const [rows] = await pool.query(query, params);
    res.json({ total: rows[0].total || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
