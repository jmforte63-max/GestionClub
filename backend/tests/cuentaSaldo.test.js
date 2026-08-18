import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularSaldoCuenta, recalcularSaldoCuenta } from '../utils/calcularSaldoCuenta.js';
import { validarSaldoParaEgreso } from '../controllers/egresosController.js';

test('calcula el saldo de una cuenta a partir del saldo base y los movimientos', () => {
  const cuenta = { id: 10, saldo: 1000 };
  const ingresos = [
    { cuenta_id: 10, total_con_iva: 350 },
    { cuenta_id: 10, monto: 150 },
    { cuenta_id: 99, total_con_iva: 999 }
  ];
  const egresos = [
    { cuenta_id: 10, total_con_iva: 120 },
    { cuenta_id: 10, monto: 80 },
    { cuenta_id: 99, total_con_iva: 999 }
  ];

  assert.equal(calcularSaldoCuenta(cuenta, ingresos, egresos), 1300);
});

test('mantiene el saldo base cuando no hay movimientos para la cuenta', () => {
  const cuenta = { id: 20, saldo: 2500 };
  const ingresos = [{ cuenta_id: 10, total_con_iva: 500 }];
  const egresos = [{ cuenta_id: 10, monto: 100 }];

  assert.equal(calcularSaldoCuenta(cuenta, ingresos, egresos), 2500);
});

test('no duplica un ingreso cuando la cuenta ya tiene saldo base', () => {
  const cuenta = { id: 30, saldo: 100 };
  const ingresos = [{ cuenta_id: 30, total_con_iva: 20 }];
  const egresos = [];

  assert.equal(calcularSaldoCuenta(cuenta, ingresos, egresos), 120);
});

test('recalcularSaldoCuenta guarda el saldo calculado sin duplicarlo', async () => {
  let updateParams = null;
  const mockPool = {
    query: async (sql, params = []) => {
      if (sql.includes('SELECT * FROM cuentas_bancarias WHERE id = ? AND club_id = ? LIMIT 1')) {
        return [[{ id: 40, saldo: 100, club_id: 7 }]];
      }

      if (sql.includes('FROM ingresos WHERE cuenta_id = ? AND club_id = ?')) {
        return [[{ cuenta_id: 40, total_con_iva: 20, monto: 20 }]];
      }

      if (sql.includes('FROM egresos WHERE cuenta_id = ? AND club_id = ?')) {
        return [[]];
      }

      if (sql.includes('UPDATE cuentas_bancarias SET saldo = ? WHERE id = ? AND club_id = ?')) {
        updateParams = params;
        return [{ affectedRows: 1 }];
      }

      return [[ ]];
    }
  };

  const saldo = await recalcularSaldoCuenta(mockPool, 40, 7);

  assert.equal(saldo, 120);
  assert.deepEqual(updateParams, [120, 40, 7]);
});

test('rechaza un gasto que dejaría la cuenta en negativo', () => {
  assert.equal(
    validarSaldoParaEgreso({ saldoActual: 30, totalNuevo: 40, cuentaActual: 5 }),
    false
  );

  assert.equal(
    validarSaldoParaEgreso({ saldoActual: 100, totalNuevo: 40, cuentaActual: 5 }),
    true
  );

  assert.equal(
    validarSaldoParaEgreso({ saldoActual: 50, totalNuevo: 40, totalAnterior: 10, cuentaActual: 5, cuentaAnterior: 5 }),
    true
  );
});

test('rechaza un traspaso si la cuenta destino es la misma que la origen', () => {
  assert.equal(
    validarSaldoParaEgreso({ saldoActual: 50, totalNuevo: 40, cuentaActual: 5, esTraspaso: true, cuentaDestino: 5 }),
    false
  );

  assert.equal(
    validarSaldoParaEgreso({ saldoActual: 100, totalNuevo: 40, cuentaActual: 5, esTraspaso: true, cuentaDestino: 9 }),
    true
  );
});
