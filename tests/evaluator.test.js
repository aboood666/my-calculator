import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorCode } from '../src/core/errors.js';
import { AngleMode, evaluate, roundResult } from '../src/core/evaluator.js';

describe('evaluate', () => {
  it('performs basic arithmetic', () => {
    assert.equal(evaluate('1+2'), 3);
    assert.equal(evaluate('10-4'), 6);
    assert.equal(evaluate('6*7'), 42);
    assert.equal(evaluate('9/3'), 3);
  });

  it('respects operator precedence and parentheses', () => {
    assert.equal(evaluate('1+2*3'), 7);
    assert.equal(evaluate('(1+2)*3'), 9);
    assert.equal(evaluate('2^3^2'), 512);
    assert.equal(evaluate('-2^2'), -4);
    assert.equal(evaluate('2^-1'), 0.5);
  });

  it('removes floating point noise', () => {
    assert.equal(evaluate('0.1+0.2'), 0.3);
    assert.equal(evaluate('1.1*3'), 3.3);
    assert.equal(roundResult(0.30000000000000004), 0.3);
  });

  it('supports percent as a postfix operator', () => {
    assert.equal(evaluate('50%'), 0.5);
    assert.equal(evaluate('200*10%'), 20);
    assert.equal(evaluate('100+10%'), 100.1);
  });

  it('supports implicit multiplication and constants', () => {
    assert.equal(evaluate('2(3+4)'), 14);
    assert.equal(evaluate('2pi'), roundResult(2 * Math.PI));
    assert.equal(evaluate('e'), roundResult(Math.E));
  });

  it('evaluates functions in degrees by default', () => {
    assert.equal(evaluate('sin(90)'), 1);
    assert.equal(evaluate('cos(180)'), -1);
    assert.equal(evaluate('sin(180)'), 0);
    assert.equal(evaluate('tan(45)'), 1);
    assert.equal(evaluate('asin(1)'), 90);
  });

  it('evaluates functions in radians when asked', () => {
    assert.equal(evaluate('sin(pi/2)', { angleMode: AngleMode.RADIANS }), 1);
    assert.equal(evaluate('cos(pi)', { angleMode: AngleMode.RADIANS }), -1);
    assert.equal(evaluate('atan(1)', { angleMode: AngleMode.RADIANS }), roundResult(Math.PI / 4));
  });

  it('evaluates roots, logs and absolute value', () => {
    assert.equal(evaluate('sqrt(16)'), 4);
    assert.equal(evaluate('log(1000)'), 3);
    assert.equal(evaluate('ln(e)'), 1);
    assert.equal(evaluate('abs(-5)'), 5);
    assert.equal(evaluate('sqrt 9 + 1'), 4);
  });

  it('reports division by zero', () => {
    assert.throws(
      () => evaluate('1/0'),
      (error) => error.code === ErrorCode.DIVISION_BY_ZERO,
    );
    assert.throws(
      () => evaluate('5/(2-2)'),
      (error) => error.code === ErrorCode.DIVISION_BY_ZERO,
    );
  });

  it('reports invalid domains as math errors', () => {
    assert.throws(
      () => evaluate('sqrt(-1)'),
      (error) => error.code === ErrorCode.MATH,
    );
    assert.throws(
      () => evaluate('log(0)'),
      (error) => error.code === ErrorCode.MATH,
    );
    assert.throws(
      () => evaluate('10^400'),
      (error) => error.code === ErrorCode.MATH,
    );
  });

  it('reports syntax errors for incomplete input', () => {
    assert.throws(
      () => evaluate('1+'),
      (error) => error.code === ErrorCode.SYNTAX,
    );
    assert.throws(
      () => evaluate('*2'),
      (error) => error.code === ErrorCode.SYNTAX,
    );
    assert.throws(
      () => evaluate('sqrt()'),
      (error) => error.code === ErrorCode.SYNTAX,
    );
    assert.throws(
      () => evaluate(''),
      (error) => error.code === ErrorCode.SYNTAX,
    );
  });
});
