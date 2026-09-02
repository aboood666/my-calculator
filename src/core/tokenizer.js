/**
 * Lexer: turns an expression string into a flat list of tokens.
 *
 * Responsibilities kept here on purpose:
 *  - normalising pretty symbols (× ÷ − √ π) into their ASCII forms
 *  - deciding whether `-` / `+` is unary or binary from context
 *  - inserting implicit multiplication, so `2(3+4)`, `2π` and `(1)(2)` work
 */

import { CalculatorError, ErrorCode } from './errors.js';

export const TokenType = Object.freeze({
  NUMBER: 'number',
  OPERATOR: 'operator',
  UNARY: 'unary',
  POSTFIX: 'postfix',
  FUNCTION: 'function',
  CONSTANT: 'constant',
  LPAREN: 'lparen',
  RPAREN: 'rparen',
});

export const BINARY_OPERATORS = new Set(['+', '-', '*', '/', '^']);
export const POSTFIX_OPERATORS = new Set(['%']);
export const FUNCTION_NAMES = new Set([
  'sqrt',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'log',
  'ln',
  'abs',
]);
export const CONSTANTS = new Map([
  ['pi', Math.PI],
  ['e', Math.E],
]);

/** Longest names first so a short name never swallows the start of a longer one. */
const WORDS = [...FUNCTION_NAMES, ...CONSTANTS.keys()].sort((a, b) => b.length - a.length);

/** Accepts `12`, `12.`, `.5`, `1.5e3`, `2e-7`. The exponent needs digits, so `2e` is `2 × e`. */
const NUMBER_PATTERN = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i;

const SYMBOL_ALIASES = Object.freeze({
  '×': '*',
  '÷': '/',
  '−': '-',
  '–': '-',
  '√': 'sqrt',
  π: 'pi',
});

const OPERAND_START = new Set([TokenType.NUMBER, TokenType.CONSTANT, TokenType.FUNCTION, TokenType.LPAREN]);
const OPERAND_END = new Set([TokenType.NUMBER, TokenType.CONSTANT, TokenType.RPAREN, TokenType.POSTFIX]);

/** Replace display glyphs with the ASCII forms the lexer understands. */
export function normalizeExpression(input) {
  return String(input).replace(/[×÷−–√π]/g, (glyph) => SYMBOL_ALIASES[glyph]);
}

function expectsOperand(tokens) {
  if (tokens.length === 0) return true;
  const { type } = tokens.at(-1);
  return (
    type === TokenType.OPERATOR ||
    type === TokenType.UNARY ||
    type === TokenType.LPAREN ||
    type === TokenType.FUNCTION
  );
}

/** Push a token, inserting an implicit `*` when two operands touch (`2(3)`, `2pi`). */
function push(tokens, token) {
  const previous = tokens.at(-1);
  if (previous && OPERAND_END.has(previous.type) && OPERAND_START.has(token.type)) {
    tokens.push({ type: TokenType.OPERATOR, value: '*', implicit: true });
  }
  tokens.push(token);
}

function matchWord(source) {
  const lower = source.toLowerCase();
  return WORDS.find((word) => lower.startsWith(word)) ?? null;
}

/**
 * @param {string} input
 * @returns {Array<{type: string, value: string | number}>}
 */
export function tokenize(input) {
  const source = normalizeExpression(input);
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const rest = source.slice(index);
    const numberMatch = NUMBER_PATTERN.exec(rest);
    if (numberMatch) {
      push(tokens, { type: TokenType.NUMBER, value: Number(numberMatch[0]), raw: numberMatch[0] });
      index += numberMatch[0].length;
      continue;
    }

    if (/[a-z]/i.test(char)) {
      const word = matchWord(rest);
      if (!word) throw new CalculatorError(ErrorCode.UNKNOWN_TOKEN, /^[a-z]+/i.exec(rest)[0]);
      if (FUNCTION_NAMES.has(word)) {
        push(tokens, { type: TokenType.FUNCTION, value: word });
      } else {
        push(tokens, { type: TokenType.CONSTANT, value: word, number: CONSTANTS.get(word) });
      }
      index += word.length;
      continue;
    }

    if (char === '(') {
      push(tokens, { type: TokenType.LPAREN, value: char });
    } else if (char === ')') {
      tokens.push({ type: TokenType.RPAREN, value: char });
    } else if (POSTFIX_OPERATORS.has(char)) {
      tokens.push({ type: TokenType.POSTFIX, value: char });
    } else if (BINARY_OPERATORS.has(char)) {
      if ((char === '-' || char === '+') && expectsOperand(tokens)) {
        // A unary plus is a no-op and is dropped; a unary minus becomes `neg`.
        if (char === '-') tokens.push({ type: TokenType.UNARY, value: 'neg' });
      } else {
        tokens.push({ type: TokenType.OPERATOR, value: char });
      }
    } else {
      throw new CalculatorError(ErrorCode.UNKNOWN_TOKEN, char);
    }
    index += 1;
  }

  return tokens;
}
