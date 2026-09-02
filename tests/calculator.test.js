import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Calculator, MAX_HISTORY } from '../src/core/calculator.js';
import { ErrorCode } from '../src/core/errors.js';

/** Feed a string of single-character inputs. */
function type(calculator, text) {
  for (const char of text) calculator.input(char);
  return calculator;
}

describe('Calculator input rules', () => {
  it('builds an expression from key presses', () => {
    const calc = type(new Calculator(), '12+3');
    assert.equal(calc.state.expression, '12+3');
  });

  it('replaces a trailing operator instead of stacking them', () => {
    const calc = type(new Calculator(), '2+*');
    assert.equal(calc.state.expression, '2*');
  });

  it('allows a negative operand after multiply, divide and power', () => {
    assert.equal(type(new Calculator(), '2*-').state.expression, '2*-');
    assert.equal(type(new Calculator(), '2/-').state.expression, '2/-');
    assert.equal(type(new Calculator(), '2+-').state.expression, '2-');
    assert.equal(type(new Calculator(), '2*-+').state.expression, '2+');
  });

  it('only allows a leading minus at the start of an expression or after `(`', () => {
    assert.equal(type(new Calculator(), '*').state.expression, '');
    assert.equal(type(new Calculator(), '-').state.expression, '-');
    assert.equal(type(new Calculator(), '(+').state.expression, '(');
    assert.equal(type(new Calculator(), '(-').state.expression, '(-');
  });

  it('prevents a second decimal point in the same number', () => {
    assert.equal(type(new Calculator(), '1.2.3').state.expression, '1.23');
    assert.equal(type(new Calculator(), '1.2+3.4').state.expression, '1.2+3.4');
  });

  it('prefixes a bare decimal point with zero', () => {
    assert.equal(type(new Calculator(), '.5').state.expression, '0.5');
    assert.equal(type(new Calculator(), '2+.5').state.expression, '2+0.5');
  });

  it('replaces a lone leading zero', () => {
    assert.equal(type(new Calculator(), '07').state.expression, '7');
    assert.equal(type(new Calculator(), '0.7').state.expression, '0.7');
    assert.equal(type(new Calculator(), '10').state.expression, '10');
  });

  it('ignores a closing parenthesis that has nothing to close', () => {
    assert.equal(type(new Calculator(), '2)').state.expression, '2');
    assert.equal(type(new Calculator(), '(2+)').state.expression, '(2+');
    assert.equal(type(new Calculator(), '(2+3)').state.expression, '(2+3)');
  });

  it('only allows percent after a value', () => {
    assert.equal(type(new Calculator(), '%').state.expression, '');
    assert.equal(type(new Calculator(), '2+%').state.expression, '2+');
    assert.equal(type(new Calculator(), '50%').state.expression, '50%');
  });

  it('caps the expression length', () => {
    const calc = type(new Calculator(), '9'.repeat(300));
    assert.equal(calc.state.expression.length, 200);
  });
});

describe('Calculator evaluation', () => {
  it('evaluates and records history', () => {
    const calc = type(new Calculator(), '2+3*4');
    calc.evaluate();
    const { result, expression, justEvaluated, history } = calc.state;
    assert.equal(result, 14);
    assert.equal(expression, '2+3*4');
    assert.equal(justEvaluated, true);
    assert.equal(history.length, 1);
    assert.equal(history[0].expression, '2+3*4');
    assert.equal(history[0].result, 14);
    assert.equal(typeof history[0].timestamp, 'number');
  });

  it('auto-closes parentheses and drops a trailing operator before evaluating', () => {
    const calc = type(new Calculator(), '2*(3+4');
    calc.evaluate();
    assert.equal(calc.state.result, 14);
    assert.equal(calc.state.expression, '2*(3+4)');

    const dangling = type(new Calculator(), '5+');
    dangling.evaluate();
    assert.equal(dangling.state.result, 5);
  });

  it('pressing equals twice does not duplicate history', () => {
    const calc = type(new Calculator(), '1+1');
    calc.evaluate();
    calc.evaluate();
    assert.equal(calc.state.history.length, 1);
  });

  it('continues from the result when an operator follows equals', () => {
    const calc = type(new Calculator(), '6*7');
    calc.evaluate();
    type(calc, '+8');
    assert.equal(calc.state.expression, '42+8');
    calc.evaluate();
    assert.equal(calc.state.result, 50);
  });

  it('starts a fresh expression when a digit follows equals', () => {
    const calc = type(new Calculator(), '6*7');
    calc.evaluate();
    type(calc, '5');
    assert.equal(calc.state.expression, '5');
    assert.equal(calc.state.justEvaluated, false);
  });

  it('wraps the result when a function follows equals', () => {
    const calc = type(new Calculator(), '8*2');
    calc.evaluate();
    calc.applyFunction('sqrt');
    assert.equal(calc.state.expression, 'sqrt(16)');
    calc.evaluate();
    assert.equal(calc.state.result, 4);
  });

  it('surfaces typed errors and recovers on the next input', () => {
    const calc = type(new Calculator(), '1/0');
    calc.evaluate();
    assert.equal(calc.state.error?.code, ErrorCode.DIVISION_BY_ZERO);
    assert.equal(calc.state.result, null);

    type(calc, '7');
    assert.equal(calc.state.error, null);
    assert.equal(calc.state.expression, '7');
  });

  it('ignores an empty expression', () => {
    const calc = new Calculator();
    calc.evaluate();
    assert.equal(calc.state.history.length, 0);
    assert.equal(calc.state.justEvaluated, false);
  });

  it('shows a live preview while typing, but not for plain numbers', () => {
    const calc = type(new Calculator(), '12');
    assert.equal(calc.state.preview, null);
    type(calc, '*3');
    assert.equal(calc.state.preview, 36);
    type(calc, '+');
    assert.equal(calc.state.preview, 36);
    calc.evaluate();
    assert.equal(calc.state.preview, null);
  });

  it('respects the angle mode', () => {
    const calc = new Calculator({ angleMode: 'rad' });
    calc.applyFunction('cos');
    type(calc, 'pi');
    calc.evaluate();
    assert.equal(calc.state.result, -1);

    calc.setAngleMode('deg');
    calc.clearAll();
    calc.applyFunction('cos');
    type(calc, '180');
    calc.evaluate();
    assert.equal(calc.state.result, -1);
  });

  it('trims history to the maximum length and drops corrupt entries', () => {
    const saved = Array.from({ length: MAX_HISTORY + 10 }, (_, i) => ({
      expression: `${i}+1`,
      result: i + 1,
      timestamp: i,
    }));
    const calc = new Calculator({ history: [...saved, { bogus: true }, null] });
    assert.equal(calc.state.history.length, MAX_HISTORY);
    type(calc, '1+1');
    calc.evaluate();
    assert.equal(calc.state.history.length, MAX_HISTORY);
    assert.equal(calc.state.history[0].expression, '1+1');
  });
});

describe('Calculator editing', () => {
  it('backspace removes one character or a whole function call', () => {
    const calc = type(new Calculator(), '12');
    calc.backspace();
    assert.equal(calc.state.expression, '1');
    calc.applyFunction('sqrt');
    assert.equal(calc.state.expression, '1sqrt(');
    calc.backspace();
    assert.equal(calc.state.expression, '1');
  });

  it('backspace after equals clears the line', () => {
    const calc = type(new Calculator(), '1+1');
    calc.evaluate();
    calc.backspace();
    assert.equal(calc.state.expression, '');
    assert.equal(calc.state.result, null);
  });

  it('toggles the sign of the number being typed', () => {
    const calc = type(new Calculator(), '5-3');
    calc.toggleSign();
    assert.equal(calc.state.expression, '5-(-3');
    calc.toggleSign();
    assert.equal(calc.state.expression, '5-3');
    calc.toggleSign();
    calc.evaluate();
    assert.equal(calc.state.result, 8);
  });

  it('toggles the sign of a result and keeps chaining', () => {
    const calc = type(new Calculator(), '2+3');
    calc.evaluate();
    calc.toggleSign();
    assert.equal(calc.state.result, -5);
    type(calc, '*2');
    calc.evaluate();
    assert.equal(calc.state.result, -10);
  });

  it('recalls history results and expressions', () => {
    const calc = type(new Calculator(), '9*9');
    calc.evaluate();
    const [entry] = calc.state.history;

    calc.clearAll();
    calc.recallResult(entry);
    type(calc, '+1');
    calc.evaluate();
    assert.equal(calc.state.result, 82);

    calc.recallExpression(entry);
    assert.equal(calc.state.expression, '9*9');
    assert.equal(calc.state.justEvaluated, false);
  });

  it('clears history independently of the current line', () => {
    const calc = type(new Calculator(), '1+1');
    calc.evaluate();
    type(calc, '+5');
    calc.clearHistory();
    assert.equal(calc.state.history.length, 0);
    assert.equal(calc.state.expression, '2+5');
  });

  it('notifies subscribers with an immutable snapshot', () => {
    const calc = new Calculator();
    const seen = [];
    const unsubscribe = calc.subscribe((state) => seen.push(state));
    type(calc, '4');
    assert.equal(seen.length, 1);
    assert.ok(Object.isFrozen(seen[0]));
    unsubscribe();
    type(calc, '2');
    assert.equal(seen.length, 1);
  });
});
