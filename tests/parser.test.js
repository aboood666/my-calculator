import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorCode } from '../src/core/errors.js';
import { toPostfix } from '../src/core/parser.js';
import { tokenize } from '../src/core/tokenizer.js';

const rpn = (expression) => toPostfix(tokenize(expression)).map((token) => token.value);

describe('toPostfix', () => {
  it('orders by precedence', () => {
    assert.deepEqual(rpn('1+2*3'), [1, 2, 3, '*', '+']);
    assert.deepEqual(rpn('(1+2)*3'), [1, 2, '+', 3, '*']);
  });

  it('keeps left-associative operators in order', () => {
    assert.deepEqual(rpn('8-3-2'), [8, 3, '-', 2, '-']);
    assert.deepEqual(rpn('8/2/2'), [8, 2, '/', 2, '/']);
  });

  it('makes exponentiation right-associative', () => {
    assert.deepEqual(rpn('2^3^2'), [2, 3, 2, '^', '^']);
  });

  it('binds unary minus looser than power but tighter than multiplication', () => {
    assert.deepEqual(rpn('-2^2'), [2, 2, '^', 'neg']);
    assert.deepEqual(rpn('2^-3'), [2, 3, 'neg', '^']);
    assert.deepEqual(rpn('-2*3'), [2, 'neg', 3, '*']);
  });

  it('applies postfix percent to the preceding value', () => {
    assert.deepEqual(rpn('200*10%'), [200, 10, '%', '*']);
    assert.deepEqual(rpn('(1+2)%'), [1, 2, '+', '%']);
  });

  it('emits function calls after their argument', () => {
    assert.deepEqual(rpn('sqrt(4)+1'), [4, 'sqrt', 1, '+']);
    assert.deepEqual(rpn('sin(30)*2'), [30, 'sin', 2, '*']);
  });

  it('reports unbalanced parentheses', () => {
    assert.throws(
      () => rpn('(1+2'),
      (error) => error.code === ErrorCode.UNBALANCED_PARENS,
    );
    assert.throws(
      () => rpn('1+2)'),
      (error) => error.code === ErrorCode.UNBALANCED_PARENS,
    );
  });
});
