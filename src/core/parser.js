/**
 * Shunting-yard parser: converts a token list into Reverse Polish Notation.
 * Handles operator precedence, right-associative `^`, unary minus, postfix `%`,
 * function calls and parentheses.
 */

import { CalculatorError, ErrorCode } from './errors.js';
import { TokenType } from './tokenizer.js';

const OPERATORS = Object.freeze({
  '+': { precedence: 1, associativity: 'left' },
  '-': { precedence: 1, associativity: 'left' },
  '*': { precedence: 2, associativity: 'left' },
  '/': { precedence: 2, associativity: 'left' },
  '^': { precedence: 4, associativity: 'right' },
});

/** `-2^2` must evaluate as `-(2^2)`, so unary minus sits between `*` and `^`. */
const UNARY_PRECEDENCE = 3;
/** A bare function application (`sqrt 4 + 1`) binds tighter than everything. */
const FUNCTION_PRECEDENCE = 5;

function precedenceOf(token) {
  if (token.type === TokenType.UNARY) return UNARY_PRECEDENCE;
  if (token.type === TokenType.FUNCTION) return FUNCTION_PRECEDENCE;
  return OPERATORS[token.value].precedence;
}

/**
 * @param {Array<object>} tokens output of `tokenize`
 * @returns {Array<object>} the same tokens in postfix order
 */
export function toPostfix(tokens) {
  const output = [];
  const stack = [];

  for (const token of tokens) {
    switch (token.type) {
      case TokenType.NUMBER:
      case TokenType.CONSTANT:
      case TokenType.POSTFIX:
        output.push(token);
        break;

      case TokenType.FUNCTION:
      case TokenType.UNARY:
      case TokenType.LPAREN:
        stack.push(token);
        break;

      case TokenType.OPERATOR: {
        const { precedence, associativity } = OPERATORS[token.value];
        while (stack.length > 0) {
          const top = stack.at(-1);
          if (top.type === TokenType.LPAREN) break;
          const topPrecedence = precedenceOf(top);
          const shouldPop =
            topPrecedence > precedence || (topPrecedence === precedence && associativity === 'left');
          if (!shouldPop) break;
          output.push(stack.pop());
        }
        stack.push(token);
        break;
      }

      case TokenType.RPAREN: {
        let matched = false;
        while (stack.length > 0) {
          const top = stack.pop();
          if (top.type === TokenType.LPAREN) {
            matched = true;
            break;
          }
          output.push(top);
        }
        if (!matched) throw new CalculatorError(ErrorCode.UNBALANCED_PARENS);
        if (stack.at(-1)?.type === TokenType.FUNCTION) output.push(stack.pop());
        break;
      }

      default:
        throw new CalculatorError(ErrorCode.SYNTAX, token.type);
    }
  }

  while (stack.length > 0) {
    const top = stack.pop();
    if (top.type === TokenType.LPAREN) throw new CalculatorError(ErrorCode.UNBALANCED_PARENS);
    output.push(top);
  }

  return output;
}
