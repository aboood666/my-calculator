/**
 * Error codes and the error type thrown by the calculation engine.
 * Every failure the UI needs to show is a `CalculatorError` with a stable `code`,
 * so the interface can decide how to present it without parsing messages.
 */

export const ErrorCode = Object.freeze({
  SYNTAX: 'SYNTAX',
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  UNBALANCED_PARENS: 'UNBALANCED_PARENS',
  MATH: 'MATH',
  UNKNOWN_TOKEN: 'UNKNOWN_TOKEN',
});

const MESSAGES = Object.freeze({
  [ErrorCode.SYNTAX]: 'Syntax error',
  [ErrorCode.DIVISION_BY_ZERO]: 'Cannot divide by zero',
  [ErrorCode.UNBALANCED_PARENS]: 'Unbalanced parentheses',
  [ErrorCode.MATH]: 'Math error',
  [ErrorCode.UNKNOWN_TOKEN]: 'Unknown symbol',
});

export class CalculatorError extends Error {
  /**
   * @param {keyof typeof ErrorCode} code
   * @param {string} [detail] extra context (for example the offending symbol)
   */
  constructor(code, detail) {
    super(MESSAGES[code] ?? 'Error');
    this.name = 'CalculatorError';
    this.code = code;
    this.detail = detail;
  }
}
