/**
 * The calculator state machine. Framework-free and DOM-free, so the whole
 * behaviour (input rules, chaining after `=`, history, error recovery) is unit tested.
 *
 * The UI subscribes with `subscribe(listener)` and re-renders from the
 * immutable snapshot passed to the listener.
 */

import { CalculatorError } from './errors.js';
import { AngleMode, evaluate } from './evaluator.js';
import { BINARY_OPERATORS, FUNCTION_NAMES } from './tokenizer.js';

export const MAX_HISTORY = 50;
export const MAX_EXPRESSION_LENGTH = 200;

const NUMBER_SEGMENT = /(?:\d+\.?\d*|\.\d+)$/;
const TRAILING_OPERATORS = /[-+*/^]+$/;
const TRAILING_FUNCTION_CALL = /[a-z]+\($/i;
const PLAIN_NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const SIGNED_TAIL = /(\(-)?((?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|pi|e)$/i;

/** `*`, `/` and `^` may be followed by a unary minus (`2*-3`). */
const ALLOWS_NEGATIVE_OPERAND = new Set(['*', '/', '^']);

const isBinaryOperator = (text) => BINARY_OPERATORS.has(text);
const isDigit = (text) => /^\d$/.test(text);

function countOpenParens(expression) {
  let depth = 0;
  for (const char of expression) {
    if (char === '(') depth += 1;
    else if (char === ')' && depth > 0) depth -= 1;
  }
  return depth;
}

/** Append missing `)` so `2*(3+4` evaluates as the user intends. */
function autoClose(expression) {
  return expression + ')'.repeat(countOpenParens(expression));
}

function currentNumberSegment(expression) {
  return NUMBER_SEGMENT.exec(expression)?.[0] ?? '';
}

/** Number → expression text that the tokenizer can read back (`1e+21`, `-5`). */
function toExpressionText(value) {
  return String(value);
}

export class Calculator {
  #expression = '';
  #result = null;
  #error = null;
  #preview = null;
  #justEvaluated = false;
  #history = [];
  #angleMode = AngleMode.DEGREES;
  #listeners = new Set();

  /**
   * @param {{ history?: Array<{expression: string, result: number, timestamp: number}>, angleMode?: 'deg' | 'rad' }} [options]
   */
  constructor({ history = [], angleMode = AngleMode.DEGREES } = {}) {
    this.#history = history.filter(isValidHistoryEntry).slice(0, MAX_HISTORY);
    this.#angleMode = angleMode === AngleMode.RADIANS ? AngleMode.RADIANS : AngleMode.DEGREES;
  }

  /** Immutable snapshot for rendering. */
  get state() {
    return Object.freeze({
      expression: this.#expression,
      result: this.#result,
      error: this.#error,
      preview: this.#preview,
      justEvaluated: this.#justEvaluated,
      angleMode: this.#angleMode,
      history: this.#history.map((entry) => ({ ...entry })),
    });
  }

  /**
   * @param {(state: ReturnType<Calculator['state']>) => void} listener
   * @returns {() => void} unsubscribe
   */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Insert a digit, operator, constant, `.`, `%`, `(` or `)`. Invalid sequences are ignored. */
  input(text) {
    this.#beginEdit(text);

    let next = this.#expression;
    let insert = text;

    if (isBinaryOperator(text)) {
      const trimmed = next.replace(TRAILING_OPERATORS, '');
      const stripped = next.slice(trimmed.length);
      const last = trimmed.at(-1);

      if (trimmed === '' || last === '(') {
        if (text !== '-') return;
        next = trimmed;
      } else if (stripped.length === 1 && text === '-' && ALLOWS_NEGATIVE_OPERAND.has(stripped)) {
        next = trimmed + stripped;
      } else {
        next = trimmed;
      }
    } else if (text === '.') {
      const segment = currentNumberSegment(next);
      if (segment.includes('.')) return;
      if (segment === '') insert = '0.';
    } else if (isDigit(text)) {
      if (currentNumberSegment(next) === '0') next = next.slice(0, -1);
    } else if (text === ')') {
      const last = next.at(-1);
      if (countOpenParens(next) === 0 || last === '(' || isBinaryOperator(last)) return;
    } else if (text === '%') {
      const last = next.at(-1);
      if (!last || !/[\d).ie]/i.test(last) || /[a-z]\($/i.test(next)) return;
    }

    this.#commit(next + insert);
  }

  /** Insert `name(`; after `=` the function wraps the previous result instead. */
  applyFunction(name) {
    if (!FUNCTION_NAMES.has(name)) return;
    if (this.#justEvaluated && this.#result !== null && !this.#error) {
      this.#justEvaluated = false;
      this.#commit(`${name}(${toExpressionText(this.#result)})`);
      return;
    }
    this.#beginEdit(name);
    this.#commit(`${this.#expression}${name}(`);
  }

  /** Remove the last character, or a whole `func(` token. After `=` it clears the line. */
  backspace() {
    if (this.#justEvaluated || this.#error) {
      this.clearAll();
      return;
    }
    const call = TRAILING_FUNCTION_CALL.exec(this.#expression);
    const next = call ? this.#expression.slice(0, -call[0].length) : this.#expression.slice(0, -1);
    this.#commit(next);
  }

  clearAll() {
    this.#expression = '';
    this.#result = null;
    this.#error = null;
    this.#justEvaluated = false;
    this.#emit();
  }

  /** Negate the number being typed, or the result shown after `=`. */
  toggleSign() {
    if (this.#error) return;

    if (this.#justEvaluated) {
      if (this.#result === null) return;
      this.#result = -this.#result;
      this.#expression = toExpressionText(this.#result);
      this.#emit();
      return;
    }

    const match = SIGNED_TAIL.exec(this.#expression);
    if (!match) return;
    const [full, wrapped, operand] = match;
    const head = this.#expression.slice(0, -full.length);
    this.#commit(wrapped ? head + operand : `${head}(-${operand}`);
  }

  evaluate() {
    if (this.#justEvaluated) return;
    const expression = autoClose(this.#expression.replace(TRAILING_OPERATORS, ''));
    if (expression === '') return;

    try {
      const result = evaluate(expression, { angleMode: this.#angleMode });
      this.#expression = expression;
      this.#result = result;
      this.#error = null;
      this.#pushHistory(expression, result);
    } catch (error) {
      if (!(error instanceof CalculatorError)) throw error;
      this.#expression = expression;
      this.#result = null;
      this.#error = error;
    }
    this.#justEvaluated = true;
    this.#emit();
  }

  /** Load a past result so the next operator continues from it. */
  recallResult(entry) {
    if (!isValidHistoryEntry(entry)) return;
    this.#expression = toExpressionText(entry.result);
    this.#result = entry.result;
    this.#error = null;
    this.#justEvaluated = true;
    this.#emit();
  }

  /** Load a past expression back into the editor. */
  recallExpression(entry) {
    if (!isValidHistoryEntry(entry)) return;
    this.#error = null;
    this.#justEvaluated = false;
    this.#commit(entry.expression);
  }

  clearHistory() {
    this.#history = [];
    this.#emit();
  }

  setAngleMode(mode) {
    if (mode !== AngleMode.DEGREES && mode !== AngleMode.RADIANS) return;
    this.#angleMode = mode;
    this.#emit();
  }

  /** Decide whether the next keystroke starts fresh or continues from the last result. */
  #beginEdit(text) {
    if (this.#error) {
      this.#expression = '';
      this.#error = null;
      this.#justEvaluated = false;
      return;
    }
    if (!this.#justEvaluated) return;

    const continues = this.#result !== null && (isBinaryOperator(text) || text === '%' || text === ')');
    this.#expression = continues ? toExpressionText(this.#result) : '';
    this.#justEvaluated = false;
  }

  #commit(expression) {
    if (expression.length > MAX_EXPRESSION_LENGTH) return;
    this.#expression = expression;
    this.#emit();
  }

  #pushHistory(expression, result) {
    this.#history = [{ expression, result, timestamp: Date.now() }, ...this.#history].slice(0, MAX_HISTORY);
  }

  #computePreview() {
    if (this.#justEvaluated || this.#error) return null;
    const expression = autoClose(this.#expression.replace(TRAILING_OPERATORS, ''));
    if (expression === '' || PLAIN_NUMBER.test(expression)) return null;
    try {
      return evaluate(expression, { angleMode: this.#angleMode });
    } catch {
      return null;
    }
  }

  #emit() {
    this.#preview = this.#computePreview();
    const snapshot = this.state;
    for (const listener of this.#listeners) listener(snapshot);
  }
}

function isValidHistoryEntry(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.expression === 'string' &&
    typeof entry.result === 'number' &&
    Number.isFinite(entry.result)
  );
}
