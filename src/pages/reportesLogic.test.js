import test from 'node:test';
import assert from 'node:assert/strict';

import { getMesesDeTrimestre, getPeriodoActual, calcularIvaMovimiento, calcularSaldoAcumuladoPorCuenta } from './reportesLogic.js';

test('getMesesDeTrimestre devuelve los meses del trimestre seleccionado', () => {
  assert.deepEqual(getMesesDeTrimestre('01', '2025/26'), ['07', '08', '09']);
  assert.deepEqual(getMesesDeTrimestre('03', '2025/26'), ['01', '02', '03']);
});

test('getPeriodoActual no usa rango de trimestre final', () => {
  const periodo = getPeriodoActual('02', '2025/26');
  assert.deepEqual(periodo, ['10', '11', '12']);
});

test('calcularIvaMovimiento suma el impuesto del total con IVA', () => {
  assert.equal(calcularIvaMovimiento({ monto: 100, total_con_iva: 121, iva: 21 }), 21);
  assert.equal(calcularIvaMovimiento({ monto: 100, iva: 21 }), 21);
});

test('calcularIvaMovimiento usa el IVA del concepto si el registro antiguo no lo tiene', () => {
  assert.equal(calcularIvaMovimiento({ monto: 100, total_con_iva: 100, iva: 0 }, 21), 21);
});

test('calcularSaldoAcumuladoPorCuenta actualiza el saldo en cada movimiento', () => {
  const movimientos = [
    { _tipo: 'ingreso', fecha: '2025-07-01', monto: 100, total_con_iva: 100 },
    { _tipo: 'egreso', fecha: '2025-07-02', monto: 30, total_con_iva: 30 },
    { _tipo: 'ingreso', fecha: '2025-07-03', monto: 20, total_con_iva: 20 },
  ];

  const resultado = calcularSaldoAcumuladoPorCuenta(movimientos);

  assert.deepEqual(resultado.map((movimiento) => Number(movimiento.saldoAcumulado.toFixed(2))), [100, 70, 90]);
});
