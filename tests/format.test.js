import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatExpression, formatNumber } from '../src/core/format.js';

describe('formatNumber', () => {
  it('groups thousands and trims trailing decimals', () => {
    assert.equal(formatNumber(1234567.5), '1,234,567.5');
    assert.equal(formatNumber(42), '42');
    assert.equal(formatNumber(-0.25), '-0.25');
  });

  it('caps fraction digits', () => {
    assert.equal(formatNumber(1 / 3), '0.3333333333');
  });

  it('switches to exponent notation for very large or small magnitudes', () => {
    assert.equal(formatNumber(1e21), '1e+21');
    assert.equal(formatNumber(1.5e-9), '1.5e-9');
    assert.equal(formatNumber(0), '0');
  });

  it('returns Error for non-finite values', () => {
    assert.equal(formatNumber(Number.NaN), 'Error');
    assert.equal(formatNumber(Number.POSITIVE_INFINITY), 'Error');
    assert.equal(formatNumber(null), 'Error');
  });
});

describe('formatExpression', () => {
  it('swaps ASCII operators for typographic glyphs', () => {
    assert.equal(formatExpression('2*3/4-1'), '2×3÷4−1');
    assert.equal(formatExpression('sqrt(pi)'), '√(π)');
  });

  it('keeps exponent signs inside numbers intact', () => {
    assert.equal(formatExpression('1e-7*2'), '1e-7×2');
    assert.equal(formatExpression('1e+21-1'), '1e+21−1');
  });
});
