export const calcularSaldoCuenta = (cuenta, ingresos = [], egresos = []) => {
  const saldoBase = Number(cuenta?.saldo ?? 0);
  const cuentaId = Number(cuenta?.id ?? 0);

  if (!cuentaId) {
    return saldoBase;
  }

  const totalIngresos = ingresos
    .filter((movimiento) => Number(movimiento?.cuenta_id ?? 0) === cuentaId)
    .reduce((suma, movimiento) => suma + Number(movimiento?.total_con_iva ?? movimiento?.monto ?? 0), 0);

  const totalEgresos = egresos
    .filter((movimiento) => Number(movimiento?.cuenta_id ?? 0) === cuentaId)
    .reduce((suma, movimiento) => suma + Number(movimiento?.total_con_iva ?? movimiento?.monto ?? 0), 0);

  return saldoBase + totalIngresos - totalEgresos;
};

export const recalcularSaldoCuenta = async (pool, cuentaId, clubId) => {
  if (!cuentaId || !clubId) {
    return null;
  }

  const [cuentas] = await pool.query(
    'SELECT * FROM cuentas_bancarias WHERE id = ? AND club_id = ? LIMIT 1',
    [cuentaId, clubId]
  );

  if (!cuentas.length) {
    return null;
  }

  const cuenta = cuentas[0];
  const [ingresosRows] = await pool.query(
    'SELECT cuenta_id, total_con_iva, monto FROM ingresos WHERE cuenta_id = ? AND club_id = ?',
    [cuentaId, clubId]
  );

  const [egresosRows] = await pool.query(
    'SELECT cuenta_id, total_con_iva, monto FROM egresos WHERE cuenta_id = ? AND club_id = ?',
    [cuentaId, clubId]
  );

  const saldoCalculado = calcularSaldoCuenta(cuenta, ingresosRows, egresosRows);

  await pool.query(
    'UPDATE cuentas_bancarias SET saldo = ? WHERE id = ? AND club_id = ?',
    [saldoCalculado, cuentaId, clubId]
  );

  return saldoCalculado;
};
