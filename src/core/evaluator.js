/**
 * Evaluates postfix token lists. Also exposes `evaluate(expression)`, which runs
 * the full tokenize → parse → evaluate pipeline.
 */

import { CalculatorError, ErrorCode } from './errors.js';
import { toPostfix } from './parser.js';
import { TokenType, tokenize } from './tokenizer.js';

export const AngleMode = Object.freeze({ DEGREES: 'deg', RADIANS: 'rad' });

/** Significant digits kept in results. Removes float noise such as 0.1 + 0.2. */
const RESULT_PRECISION = 15;

/** Round away float noise so `0.1 + 0.2` shows `0.3`. */
export function roundResult(value) {
  if (!Number.isFinite(value)) return value;
  return Number(value.toPrecision(RESULT_PRECISION));
}

/** Collapse float dust produced by trig functions (`sin(180°)` = 1.2e-16 → 0). */
function cleanTrig(value) {
  return Number(value.toFixed(RESULT_PRECISION));
}

const BINARY = Object.freeze({
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => {
    if (b === 0) throw new CalculatorError(ErrorCode.DIVISION_BY_ZERO);
    return a / b;
  },
  '^': (a, b) => a ** b,
});

const POSTFIX = Object.freeze({
  '%': (a) => a / 100,
});

function createFunctions(angleMode) {
  const degrees = angleMode === AngleMode.DEGREES;
  const toRadians = degrees ? (x) => (x * Math.PI) / 180 : (x) => x;
  const fromRadians = degrees ? (x) => (x * 180) / Math.PI : (x) => x;

  return {
    sqrt: (x) => {
      if (x < 0) throw new CalculatorError(ErrorCode.MATH, 'square root of a negative number');
      return Math.sqrt(x);
    },
    abs: Math.abs,
    log: (x) => {
      if (x <= 0) throw new CalculatorError(ErrorCode.MATH, 'log of a non-positive number');
      return Math.log10(x);
    },
    ln: (x) => {
      if (x <= 0) throw new CalculatorError(ErrorCode.MATH, 'ln of a non-positive number');
      return Math.log(x);
    },
    sin: (x) => cleanTrig(Math.sin(toRadians(x))),
    cos: (x) => cleanTrig(Math.cos(toRadians(x))),
    tan: (x) => cleanTrig(Math.tan(toRadians(x))),
    asin: (x) => fromRadians(Math.asin(x)),
    acos: (x) => fromRadians(Math.acos(x)),
    atan: (x) => fromRadians(Math.atan(x)),
  };
}

function pop(stack) {
  if (stack.length === 0) throw new CalculatorError(ErrorCode.SYNTAX, 'missing operand');
  return stack.pop();
}

/**
 * @param {Array<object>} postfix tokens from `toPostfix`
 * @param {{ angleMode?: 'deg' | 'rad' }} [options]
 * @returns {number}
 */
export function evaluatePostfix(postfix, { angleMode = AngleMode.DEGREES } = {}) {
  const functions = createFunctions(angleMode);
  const stack = [];

  for (const token of postfix) {
    switch (token.type) {
      case TokenType.NUMBER:
        stack.push(token.value);
        break;
      case TokenType.CONSTANT:
        stack.push(token.number);
        break;
      case TokenType.UNARY:
        stack.push(-pop(stack));
        break;
      case TokenType.POSTFIX:
        stack.push(POSTFIX[token.value](pop(stack)));
        break;
      case TokenType.FUNCTION:
        stack.push(functions[token.value](pop(stack)));
        break;
      case TokenType.OPERATOR: {
        const right = pop(stack);
        const left = pop(stack);
        stack.push(BINARY[token.value](left, right));
        break;
      }
      default:
        throw new CalculatorError(ErrorCode.SYNTAX, token.type);
    }
  }

  if (stack.length !== 1) throw new CalculatorError(ErrorCode.SYNTAX, 'dangling operand');

  const result = stack[0];
  if (!Number.isFinite(result)) throw new CalculatorError(ErrorCode.MATH, 'result is not finite');
  return roundResult(result);
}

/**
 * Full pipeline. Throws `CalculatorError` for any user-facing failure.
 * @param {string} expression
 * @param {{ angleMode?: 'deg' | 'rad' }} [options]
 * @returns {number}
 */
export function evaluate(expression, options) {
  return evaluatePostfix(toPostfix(tokenize(expression)), options);
}
