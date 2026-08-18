import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarEscudoUrl } from '../utils/normalizarEscudoUrl.js';

test('normaliza una url válida de escudo sin romperla', () => {
  assert.equal(normalizarEscudoUrl('https://example.com/logo.png'), 'https://example.com/logo.png');
  assert.equal(normalizarEscudoUrl('example.com/logo.png'), 'https://example.com/logo.png');
});

test('devuelve cadena vacía para valores inválidos o vacíos', () => {
  assert.equal(normalizarEscudoUrl('   '), '');
  assert.equal(normalizarEscudoUrl('not a url'), '');
});
