import pool from '../config/database.js';

const canSeeAllClubs = (req) => req.user?.rol === 'admin' && String(req.user?.email || '').trim().toLowerCase() === 'admin@club.com';
const getClubId = (req) => Number(req.user?.club_id ?? 0);
const getSelectedClubId = (req) => {
  const raw = req.query?.clubId ?? req.query?.club_id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizarTexto = (valor) => String(valor ?? '').trim();
const normalizarTipoCuenta = (valor) => {
  const texto = String(valor ?? 'Banco').trim();
  const normalizado = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (normalizado.includes('tarjeta') || normalizado.includes('credito') || normalizado.includes('credit')) {
    return 'Tarjeta de crédito';
  }

  if (normalizado.includes('efectivo') || normalizado.includes('cash')) {
    return 'Efectivo';
  }

  return 'Banco';
};

export const getCuentasBancarias = async (req, res) => {
  try {
    const clubId = getClubId(req);
    const selectedClubId = canSeeAllClubs(req) ? getSelectedClubId(req) : null;
    const targetClubId = selectedClubId ?? clubId;
    const temporada = req.query?.temporada || req.query?.season || null;

    if (!targetClubId) {
      return res.json([]);
    }

    const [cuentasRows] = await pool.query(
      'SELECT * FROM cuentas_bancarias WHERE club_id = ? ORDER BY activo DESC, nombre ASC',
      [targetClubId]
    );

    return res.json(cuentasRows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const crearCuentaBancaria = async (req, res) => {
  try {
    const {
      nombre,
      tipo = 'Banco',
      banco,
      numero_cuenta,
      iban,
      saldo,
      activo = true
    } = req.body || {};

    const clubId = canSeeAllClubs(req) ? (getSelectedClubId(req) ?? getClubId(req)) : getClubId(req);

    if (!clubId) {
      return res.status(400).json({ error: 'No se pudo determinar el club asociado.' });
    }

    const nombreFinal = normalizarTexto(nombre);
    const bancoFinal = normalizarTexto(banco);
    const numeroCuentaFinal = normalizarTexto(numero_cuenta);

    if (!nombreFinal || !bancoFinal || !numeroCuentaFinal) {
      return res.status(400).json({ error: 'Faltan datos requeridos: nombre, banco y número de cuenta.' });
    }

    const tipoFinal = normalizarTipoCuenta(tipo);

    const [result] = await pool.query(
      'INSERT INTO cuentas_bancarias (club_id, nombre, tipo, banco, numero_cuenta, iban, saldo, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        clubId,
        nombreFinal,
        tipoFinal,
        bancoFinal,
        numeroCuentaFinal,
        normalizarTexto(iban),
        Number(saldo ?? 0),
        activo === true || activo === 'true' ? 1 : 0
      ]
    );

    const [rows] = await pool.query('SELECT * FROM cuentas_bancarias WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const actualizarCuentaBancaria = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      tipo = 'Banco',
      banco,
      numero_cuenta,
      iban,
      saldo,
      activo
    } = req.body || {};

    const clubId = canSeeAllClubs(req) ? (getSelectedClubId(req) ?? getClubId(req)) : getClubId(req);
    if (!clubId) {
      return res.status(400).json({ error: 'No se pudo determinar el club asociado.' });
    }

    const nombreFinal = normalizarTexto(nombre);
    const bancoFinal = normalizarTexto(banco);
    const numeroCuentaFinal = normalizarTexto(numero_cuenta);

    if (!nombreFinal || !bancoFinal || !numeroCuentaFinal) {
      return res.status(400).json({ error: 'Faltan datos requeridos: nombre, banco y número de cuenta.' });
    }

    const tipoFinal = normalizarTipoCuenta(tipo);

    const [result] = await pool.query(
      'UPDATE cuentas_bancarias SET nombre = ?, tipo = ?, banco = ?, numero_cuenta = ?, iban = ?, saldo = ?, activo = ? WHERE id = ? AND club_id = ?',
      [
        nombreFinal,
        tipoFinal,
        bancoFinal,
        numeroCuentaFinal,
        normalizarTexto(iban),
        Number(saldo ?? 0),
        activo === true || activo === 'true' ? 1 : 0,
        id,
        clubId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cuenta bancaria no encontrada' });
    }

    const [rows] = await pool.query('SELECT * FROM cuentas_bancarias WHERE id = ? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const eliminarCuentaBancaria = async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = canSeeAllClubs(req) ? (getSelectedClubId(req) ?? getClubId(req)) : getClubId(req);

    if (!clubId) {
      return res.status(400).json({ error: 'No se pudo determinar el club asociado.' });
    }

    const [result] = await pool.query('DELETE FROM cuentas_bancarias WHERE id = ? AND club_id = ?', [id, clubId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cuenta bancaria no encontrada' });
    }

    return res.json({ mensaje: 'Cuenta bancaria eliminada correctamente' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
