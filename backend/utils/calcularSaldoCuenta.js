export const calcularSaldoCuenta = (cuenta, ingresos = [], egresos = [], temporada = null) => {
  const saldoBase = Number(cuenta?.saldo ?? 0);
  const cuentaId = Number(cuenta?.id ?? 0);

  if (!cuentaId) {
    return saldoBase;
  }

  const ingresosFiltrados = Array.isArray(ingresos)
    ? ingresos.filter((movimiento) => Number(movimiento?.cuenta_id ?? 0) === cuentaId)
    : [];

  const egresosFiltrados = Array.isArray(egresos)
    ? egresos.filter((movimiento) => Number(movimiento?.cuenta_id ?? 0) === cuentaId)
    : [];

  if (temporada) {
    const ingresosTemporada = ingresosFiltrados.filter((movimiento) => {
      const nombreTemporada = String(movimiento?.temporada ?? '').trim();
      return nombreTemporada && nombreTemporada === String(temporada).trim();
    });

    const egresosTemporada = egresosFiltrados.filter((movimiento) => {
      const nombreTemporada = String(movimiento?.temporada ?? '').trim();
      return nombreTemporada && nombreTemporada === String(temporada).trim();
    });

    if (!ingresosTemporada.length && !egresosTemporada.length) {
      return 0;
    }

    const totalIngresos = ingresosTemporada.reduce((suma, movimiento) => suma + Number(movimiento?.total_con_iva ?? movimiento?.monto ?? 0), 0);
    const totalEgresos = egresosTemporada.reduce((suma, movimiento) => suma + Number(movimiento?.total_con_iva ?? movimiento?.monto ?? 0), 0);

    return totalIngresos - totalEgresos;
  }

  const totalIngresos = ingresosFiltrados.reduce((suma, movimiento) => suma + Number(movimiento?.total_con_iva ?? movimiento?.monto ?? 0), 0);
  const totalEgresos = egresosFiltrados.reduce((suma, movimiento) => suma + Number(movimiento?.total_con_iva ?? movimiento?.monto ?? 0), 0);

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
