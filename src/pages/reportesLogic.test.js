import test from 'node:test';
import assert from 'node:assert/strict';

import { getMesesDeTrimestre, getPeriodoActual, calcularIvaMovimiento } from './reportesLogic.js';

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
