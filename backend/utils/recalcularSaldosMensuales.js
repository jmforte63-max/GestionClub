import pool from '../config/database.js';

const toDateText = (value) => String(value || '').slice(0, 10);
const toAmount = (movement) => Number(movement?.total_con_iva ?? movement?.monto ?? 0);
const toSeason = (dateText) => {
  const date = new Date(`${dateText}T00:00:00`);
  const year = date.getFullYear();
  return date.getMonth() >= 6 ? `${year}/${String(year + 1).slice(-2)}` : `${year - 1}/${String(year).slice(-2)}`;
};
const monthStart = (year, month) => `${year}-${String(month).padStart(2, '0')}-01`;
const monthEnd = (year, month) => new Date(year, month, 0).toISOString().slice(0, 10);
const nextMonth = (year, month) => (month === 12 ? [year + 1, 1] : [year, month + 1]);

const getAccountMovement = (movement, accountId) => {
  const amount = toAmount(movement);
  const originId = Number(movement.cuenta_origen_id ?? movement.cuenta_id ?? 0);
  const destinationId = Number(movement.cuenta_destino_id ?? 0);
  const isTransfer = Boolean(movement.es_traspaso || destinationId);

  if (movement._tipo === 'ingreso' && Number(movement.cuenta_id) === accountId) return { income: amount, expense: 0 };
  if (movement._tipo === 'egreso' && originId === accountId) return { income: 0, expense: amount };
  if (movement._tipo === 'egreso' && isTransfer && destinationId === accountId && originId !== accountId) return { income: amount, expense: 0 };
  return null;
};

export const recalcularSaldosMensuales = async (clubId) => {
  const [accounts] = await pool.query(
    'SELECT id, saldo_inicial, fecha_saldo_inicial, fecha_creacion FROM cuentas_bancarias WHERE club_id = ?',
    [clubId]
  );
  const [incomeRows] = await pool.query('SELECT *, \'ingreso\' AS _tipo FROM ingresos WHERE club_id = ?', [clubId]);
  const [expenseRows] = await pool.query('SELECT *, \'egreso\' AS _tipo FROM egresos WHERE club_id = ?', [clubId]);
  const movements = [...incomeRows, ...expenseRows]
    .map((movement) => ({ ...movement, _fecha: toDateText(movement.fecha || movement.fecha_creacion) }))
    .filter((movement) => movement._fecha);

  await pool.query('DELETE FROM saldos_cuentas_mensuales WHERE club_id = ?', [clubId]);

  for (const account of accounts) {
    const accountId = Number(account.id);
    const initialDate = toDateText(account.fecha_saldo_inicial || account.fecha_creacion) || new Date().toISOString().slice(0, 10);
    const accountMovements = movements
      .filter((movement) => getAccountMovement(movement, accountId) && movement._fecha >= initialDate)
      .sort((first, second) => first._fecha.localeCompare(second._fecha));
    const lastMovementDate = accountMovements.at(-1)?._fecha || initialDate;
    const today = new Date().toISOString().slice(0, 10);
    const endDate = lastMovementDate > today ? lastMovementDate : today;
    const startDate = new Date(`${initialDate}T00:00:00`);
    const finalDate = new Date(`${endDate}T00:00:00`);
    let year = startDate.getFullYear();
    let month = startDate.getMonth() + 1;
    const finalYear = finalDate.getFullYear();
    const finalMonth = finalDate.getMonth() + 1;
    let balance = Number(account.saldo_inicial ?? 0);
    let movementIndex = 0;

    while (year < finalYear || (year === finalYear && month <= finalMonth)) {
      const closingDate = monthEnd(year, month);
      const openingBalance = balance;
      let income = 0;
      let expense = 0;

      while (movementIndex < accountMovements.length && accountMovements[movementIndex]._fecha <= closingDate) {
        const movement = getAccountMovement(accountMovements[movementIndex], accountId);
        income += movement.income;
        expense += movement.expense;
        balance += movement.income - movement.expense;
        movementIndex += 1;
      }

      await pool.query(
        `INSERT INTO saldos_cuentas_mensuales
          (club_id, cuenta_id, temporada, mes, fecha_inicio, fecha_cierre, saldo_inicial, total_ingresos, total_egresos, saldo_final)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (club_id, cuenta_id, temporada, mes) DO UPDATE SET
          fecha_inicio = EXCLUDED.fecha_inicio, fecha_cierre = EXCLUDED.fecha_cierre,
          saldo_inicial = EXCLUDED.saldo_inicial, total_ingresos = EXCLUDED.total_ingresos,
          total_egresos = EXCLUDED.total_egresos, saldo_final = EXCLUDED.saldo_final`,
        [clubId, accountId, toSeason(closingDate), month, monthStart(year, month), closingDate, openingBalance, income, expense, balance]
      );

      [year, month] = nextMonth(year, month);
    }
  }
};

export const recalcularTodosLosSaldosMensuales = async () => {
  const [clubs] = await pool.query('SELECT DISTINCT club_id FROM cuentas_bancarias WHERE club_id IS NOT NULL');
  for (const club of clubs) {
    await recalcularSaldosMensuales(Number(club.club_id));
  }
};