import pool from '../config/database.js';
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

const parseBoolean = (valor) => {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'string') {
    return ['1', 'true', 'yes', 'si', 'on'].includes(valor.trim().toLowerCase());
  }
  return Boolean(valor);
};

export const validarSaldoParaEgreso = ({ saldoActual, totalNuevo, totalAnterior = 0, cuentaActual, cuentaAnterior = null, esTraspaso = false, cuentaDestino = null }) => {
  const saldoActualNumero = Number(saldoActual ?? 0);
  const totalNuevoNumero = Number(totalNuevo ?? 0);
  const totalAnteriorNumero = Number(totalAnterior ?? 0);
  const cuentaActualNumero = Number(cuentaActual ?? 0);
  const cuentaAnteriorNumero = Number(cuentaAnterior ?? 0);
  const cuentaDestinoNumero = Number(cuentaDestino ?? 0);

  if (esTraspaso) {
    if (!cuentaActualNumero || !cuentaDestinoNumero || cuentaActualNumero === cuentaDestinoNumero) {
      return false;
    }
    return saldoActualNumero - totalNuevoNumero >= 0;
  }

  if (cuentaActualNumero && cuentaAnteriorNumero && cuentaActualNumero === cuentaAnteriorNumero) {
    return saldoActualNumero + totalAnteriorNumero - totalNuevoNumero >= 0;
  }

  return saldoActualNumero - totalNuevoNumero >= 0;
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
  return ahora.getMonth() >= 6 ? `${anioActual}/${String(anioActual + 1).slice(-2)}` : `${anioActual - 1}/${String(anioActual).slice(-2)}`;
};

export const getEgresos = async (req, res) => {
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
      ? `SELECT * FROM egresos WHERE ${conditions.join(' AND ')} ORDER BY fecha DESC`
      : 'SELECT * FROM egresos ORDER BY fecha DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const crearEgreso = async (req, res) => {
  try {
    const { fecha, concepto, monto, categoria, descripcion, iva, total_con_iva, cuenta_id, cuenta_destino_id, es_traspaso } = req.body;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const categoriaFinal = String(categoria || '').trim() || 'Otros';
    const temporadaFinal = resolveTemporada(req, fecha);
    const cuentaId = parseCuentaId(cuenta_id);
    const cuentaDestinoId = parseCuentaId(cuenta_destino_id);
    const esTraspaso = parseBoolean(es_traspaso || (cuentaDestinoId && cuentaDestinoId !== cuentaId));

    if (!clubId || !fecha || !concepto || !monto || !cuentaId) {
      return res.status(400).json({ error: 'Debes seleccionar una cuenta válida para el gasto.' });
    }

    if (esTraspaso && (!cuentaDestinoId || cuentaDestinoId === cuentaId)) {
      return res.status(400).json({ error: 'Para un traspaso debes elegir una cuenta de destino distinta.' });
    }

    const ivaFinal = Number(iva ?? 0);
    const montoBase = Number(monto ?? 0);
    const totalConIvaFinal = Number((montoBase * (1 + (ivaFinal / 100))).toFixed(2));

    const [cuentaActual] = await pool.query(
      'SELECT saldo FROM cuentas_bancarias WHERE id = ? AND club_id = ? LIMIT 1',
      [cuentaId, clubId]
    );
    const saldoCuentaActual = Number(cuentaActual[0]?.saldo ?? 0);

    if (!validarSaldoParaEgreso({ saldoActual: saldoCuentaActual, totalNuevo: totalConIvaFinal, cuentaActual: cuentaId, esTraspaso, cuentaDestino: cuentaDestinoId })) {
      return res.status(400).json({ error: 'No se puede registrar este gasto: la cuenta quedaría en negativo. Revisa el saldo disponible antes de continuar.' });
    }

    const [result] = await pool.query(
      'INSERT INTO egresos (usuario_id, club_id, fecha, concepto, monto, categoria, iva, total_con_iva, descripcion, temporada, cuenta_id, cuenta_origen_id, cuenta_destino_id, es_traspaso) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, clubId, fecha, concepto, montoBase, categoriaFinal, ivaFinal, totalConIvaFinal, descripcion || null, temporadaFinal, cuentaId, cuentaId, cuentaDestinoId, esTraspaso ? 1 : 0]
    );

    if (esTraspaso) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, -totalConIvaFinal);
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaDestinoId, clubId, totalConIvaFinal);
    } else {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, -totalConIvaFinal);
    }

    await recalcularSaldosMensuales(clubId);

    res.status(201).json({
      id: result.insertId,
      mensaje: 'Egreso creado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerEgreso = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const [rows] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT * FROM egresos WHERE id = ? AND club_id = ?'
        : 'SELECT * FROM egresos WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Egreso no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarEgreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, concepto, monto, categoria, descripcion, iva, total_con_iva, cuenta_id, cuenta_destino_id, es_traspaso } = req.body;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const categoriaFinal = String(categoria || '').trim() || 'Otros';
    const temporadaFinal = resolveTemporada(req, fecha);
    const cuentaId = parseCuentaId(cuenta_id);
    const cuentaDestinoId = parseCuentaId(cuenta_destino_id);
    const ivaFinal = Number(iva ?? 0);
    const montoBase = Number(monto ?? 0);
    const totalConIvaFinal = Number((montoBase * (1 + (ivaFinal / 100))).toFixed(2));

    if (!fecha || !concepto || !monto || !cuentaId) {
      return res.status(400).json({ error: 'Debes seleccionar una cuenta válida para el gasto.' });
    }

    const [movimientoActual] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT cuenta_id, cuenta_origen_id, cuenta_destino_id, es_traspaso, total_con_iva, monto FROM egresos WHERE id = ? AND club_id = ? LIMIT 1'
        : 'SELECT cuenta_id, cuenta_origen_id, cuenta_destino_id, es_traspaso, total_con_iva, monto FROM egresos WHERE id = ? LIMIT 1',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    const cuentaAnterior = movimientoActual[0]?.cuenta_id ? Number(movimientoActual[0].cuenta_id) : null;
    const cuentaOrigenAnterior = Number(movimientoActual[0]?.cuenta_origen_id ?? movimientoActual[0]?.cuenta_id ?? 0);
    const cuentaDestinoAnterior = Number(movimientoActual[0]?.cuenta_destino_id ?? 0);
    const esTraspasoActual = parseBoolean(movimientoActual[0]?.es_traspaso ?? (cuentaDestinoAnterior > 0));
    const totalAnterior = Number(movimientoActual[0]?.total_con_iva ?? movimientoActual[0]?.monto ?? 0);
    const esTraspasoFinal = Boolean(parseBoolean(es_traspaso) || esTraspasoActual || (cuentaDestinoId && cuentaDestinoId !== cuentaId));

    if (esTraspasoFinal && (!cuentaDestinoId || cuentaDestinoId === cuentaId)) {
      return res.status(400).json({ error: 'Para un traspaso debes elegir una cuenta de destino distinta.' });
    }

    let saldoCuentaValidacion = 0;
    if (cuentaAnterior && cuentaAnterior === cuentaId) {
      const [cuentaActual] = await pool.query(
        'SELECT saldo FROM cuentas_bancarias WHERE id = ? AND club_id = ? LIMIT 1',
        [cuentaId, clubId]
      );
      saldoCuentaValidacion = Number(cuentaActual[0]?.saldo ?? 0);
    } else if (cuentaId) {
      const [cuentaActual] = await pool.query(
        'SELECT saldo FROM cuentas_bancarias WHERE id = ? AND club_id = ? LIMIT 1',
        [cuentaId, clubId]
      );
      saldoCuentaValidacion = Number(cuentaActual[0]?.saldo ?? 0);
    }

    if (cuentaId && !validarSaldoParaEgreso({ saldoActual: saldoCuentaValidacion, totalNuevo: totalConIvaFinal, totalAnterior, cuentaActual: cuentaId, cuentaAnterior, esTraspaso: esTraspasoFinal, cuentaDestino: cuentaDestinoId })) {
      return res.status(400).json({ error: 'No se puede guardar este gasto: la cuenta quedaría en negativo. Ajusta el importe o elige otra cuenta.' });
    }

    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'UPDATE egresos SET fecha = ?, concepto = ?, monto = ?, categoria = ?, iva = ?, total_con_iva = ?, descripcion = ?, temporada = ?, cuenta_id = ?, cuenta_origen_id = ?, cuenta_destino_id = ?, es_traspaso = ? WHERE id = ? AND club_id = ?'
        : 'UPDATE egresos SET fecha = ?, concepto = ?, monto = ?, categoria = ?, iva = ?, total_con_iva = ?, descripcion = ?, temporada = ?, cuenta_id = ?, cuenta_origen_id = ?, cuenta_destino_id = ?, es_traspaso = ? WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req)
        ? [fecha, concepto, montoBase, categoriaFinal, ivaFinal, totalConIvaFinal, descripcion || null, temporadaFinal, cuentaId, cuentaId, cuentaDestinoId, esTraspasoFinal ? 1 : 0, id, clubId]
        : [fecha, concepto, montoBase, categoriaFinal, ivaFinal, totalConIvaFinal, descripcion || null, temporadaFinal, cuentaId, cuentaId, cuentaDestinoId, esTraspasoFinal ? 1 : 0, id]
    );

    if (esTraspasoActual) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaOrigenAnterior, clubId, totalAnterior);
      if (cuentaDestinoAnterior) {
        await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaDestinoAnterior, clubId, -totalAnterior);
      }
    } else if (cuentaAnterior && cuentaAnterior !== cuentaId) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaAnterior, clubId, totalAnterior);
    }

    if (esTraspasoFinal) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, -totalConIvaFinal);
      if (cuentaDestinoId) {
        await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaDestinoId, clubId, totalConIvaFinal);
      }
    } else if (cuentaAnterior === cuentaId) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, totalAnterior - totalConIvaFinal);
    } else {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, -totalConIvaFinal);
    }

    await recalcularSaldosMensuales(clubId);

    res.json({ mensaje: 'Egreso actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarEgreso = async (req, res) => {
  try {
    const { id } = req.params;
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const [movimientoActual] = await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT cuenta_id, cuenta_origen_id, cuenta_destino_id, es_traspaso, total_con_iva, monto FROM egresos WHERE id = ? AND club_id = ? LIMIT 1'
        : 'SELECT cuenta_id, cuenta_origen_id, cuenta_destino_id, es_traspaso, total_con_iva, monto FROM egresos WHERE id = ? LIMIT 1',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );
    const cuentaId = movimientoActual[0]?.cuenta_id ? Number(movimientoActual[0].cuenta_id) : null;
    const cuentaOrigenId = Number(movimientoActual[0]?.cuenta_origen_id ?? movimientoActual[0]?.cuenta_id ?? 0);
    const cuentaDestinoId = Number(movimientoActual[0]?.cuenta_destino_id ?? 0);
    const esTraspasoActual = parseBoolean(movimientoActual[0]?.es_traspaso ?? (cuentaDestinoId > 0));
    const totalMovimiento = Number(movimientoActual[0]?.total_con_iva ?? movimientoActual[0]?.monto ?? 0);

    await pool.query(
      selectedClubId !== null || !canSeeAllClubs(req)
        ? 'DELETE FROM egresos WHERE id = ? AND club_id = ?'
        : 'DELETE FROM egresos WHERE id = ?',
      selectedClubId !== null || !canSeeAllClubs(req) ? [id, clubId] : [id]
    );

    if (esTraspasoActual) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaOrigenId, clubId, totalMovimiento);
      if (cuentaDestinoId) {
        await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaDestinoId, clubId, -totalMovimiento);
      }
    } else if (cuentaId) {
      await actualizarSaldoCuentaDesdeMovimiento(pool, cuentaId, clubId, totalMovimiento);
    }

    await recalcularSaldosMensuales(clubId);

    res.json({ mensaje: 'Egreso eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTotalEgresos = async (req, res) => {
  try {
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const temporada = req.query?.temporada || req.query?.season || null;
    const query = temporada
      ? (selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT SUM(COALESCE(total_con_iva, monto)) as total FROM egresos WHERE club_id = ? AND temporada = ?'
        : 'SELECT SUM(COALESCE(total_con_iva, monto)) as total FROM egresos WHERE temporada = ?')
      : (selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT SUM(COALESCE(total_con_iva, monto)) as total FROM egresos WHERE club_id = ?'
        : 'SELECT SUM(COALESCE(total_con_iva, monto)) as total FROM egresos');
    const params = temporada
      ? (selectedClubId !== null || !canSeeAllClubs(req) ? [clubId, temporada] : [temporada])
      : (selectedClubId !== null || !canSeeAllClubs(req) ? [clubId] : []);
    const [rows] = await pool.query(query, params);
    res.json({ total: rows[0].total || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEgresosPorCategoria = async (req, res) => {
  try {
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const clubId = selectedClubId ?? getClubId(req);
    const temporada = req.query?.temporada || req.query?.season || null;
    const query = temporada
      ? (selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT categoria, SUM(COALESCE(total_con_iva, monto)) as total FROM egresos WHERE club_id = ? AND temporada = ? GROUP BY categoria ORDER BY categoria ASC'
        : 'SELECT categoria, SUM(COALESCE(total_con_iva, monto)) as total FROM egresos WHERE temporada = ? GROUP BY categoria ORDER BY categoria ASC')
      : (selectedClubId !== null || !canSeeAllClubs(req)
        ? 'SELECT categoria, SUM(COALESCE(total_con_iva, monto)) as total FROM egresos WHERE club_id = ? GROUP BY categoria ORDER BY categoria ASC'
        : 'SELECT categoria, SUM(COALESCE(total_con_iva, monto)) as total FROM egresos GROUP BY categoria ORDER BY categoria ASC');
    const params = temporada
      ? (selectedClubId !== null || !canSeeAllClubs(req) ? [clubId, temporada] : [temporada])
      : (selectedClubId !== null || !canSeeAllClubs(req) ? [clubId] : []);
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
