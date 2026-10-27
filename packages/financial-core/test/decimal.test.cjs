const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDecimal } = require('../dist');
test('preserves exact precision and normalizes zero without floating point', () => {
  assert.equal(normalizeDecimal('9007199254740993.123456789123'), '9007199254740993.123456789123');
  assert.equal(normalizeDecimal('-0.0'), '0.000000000000');
  assert.equal(normalizeDecimal('-2.1'), '-2.100000000000');
  assert.equal(normalizeDecimal('99999999999999999999999999.999999999999'), '99999999999999999999999999.999999999999');
});
test('rejects ambiguous, lossy and overflowing inputs instead of rounding', () => {
  for (const value of [1.1, NaN, Infinity, null, '', '01', '+1', '1e3', '1,23', ' 1', '1.', '.1', '0.1234567891234', '100000000000000000000000000']) {
    assert.throws(() => normalizeDecimal(value));
  }
});
