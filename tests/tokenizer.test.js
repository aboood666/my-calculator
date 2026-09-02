import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CalculatorError, ErrorCode } from '../src/core/errors.js';
import { TokenType, normalizeExpression, tokenize } from '../src/core/tokenizer.js';

const types = (expression) => tokenize(expression).map((token) => token.type);
const values = (expression) => tokenize(expression).map((token) => token.value);

describe('tokenize', () => {
  it('reads integers, decimals and exponent notation as single numbers', () => {
    assert.deepEqual(values('12 3.5 .5 1e3 2e-7'), [12, '*', 3.5, '*', 0.5, '*', 1000, '*', 2e-7]);
  });

  it('treats `2e` as two times Euler’s number, not an incomplete exponent', () => {
    assert.deepEqual(types('2e'), [TokenType.NUMBER, TokenType.OPERATOR, TokenType.CONSTANT]);
  });

  it('classifies a leading or post-operator minus as unary', () => {
    assert.deepEqual(types('-3'), [TokenType.UNARY, TokenType.NUMBER]);
    assert.deepEqual(types('2*-3'), [
      TokenType.NUMBER,
      TokenType.OPERATOR,
      TokenType.UNARY,
      TokenType.NUMBER,
    ]);
    assert.deepEqual(types('(-3)'), [TokenType.LPAREN, TokenType.UNARY, TokenType.NUMBER, TokenType.RPAREN]);
  });

  it('drops a unary plus', () => {
    assert.deepEqual(values('+3'), [3]);
  });

  it('inserts implicit multiplication between adjacent operands', () => {
    assert.deepEqual(values('2(3)'), [2, '*', '(', 3, ')']);
    assert.deepEqual(values('(1)(2)'), ['(', 1, ')', '*', '(', 2, ')']);
    assert.deepEqual(values('2pi'), [2, '*', 'pi']);
    assert.deepEqual(values('3sqrt(4)'), [3, '*', 'sqrt', '(', 4, ')']);
    assert.deepEqual(values('50%2'), [50, '%', '*', 2]);
  });

  it('recognises functions and constants case-insensitively', () => {
    assert.deepEqual(values('SIN(PI)'), ['sin', '(', 'pi', ')']);
  });

  it('normalises typographic symbols', () => {
    assert.equal(normalizeExpression('2×3÷4−1√π'), '2*3/4-1sqrtpi');
    assert.deepEqual(values('2×3'), [2, '*', 3]);
  });

  it('rejects unknown symbols with a typed error', () => {
    assert.throws(
      () => tokenize('2 $ 3'),
      (error) =>
        error instanceof CalculatorError && error.code === ErrorCode.UNKNOWN_TOKEN && error.detail === '$',
    );
    assert.throws(
      () => tokenize('foo(2)'),
      (error) => error.code === ErrorCode.UNKNOWN_TOKEN,
    );
  });
});
