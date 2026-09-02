/**
 * Renders the expression line and the result line from a calculator snapshot.
 */

import { formatExpression, formatNumber } from '../core/format.js';

const LONG_RESULT = 12;

/**
 * @param {{ expressionEl: HTMLElement, resultEl: HTMLElement }} elements
 */
export function createDisplay({ expressionEl, resultEl }) {
  return {
    render(state) {
      expressionEl.textContent = state.expression ? formatExpression(state.expression) : '';
      expressionEl.scrollLeft = expressionEl.scrollWidth;

      let text = '0';
      let mode = 'idle';

      if (state.error) {
        text = state.error.message;
        mode = 'error';
      } else if (state.justEvaluated && state.result !== null) {
        text = formatNumber(state.result);
        mode = 'result';
      } else if (state.preview !== null) {
        text = formatNumber(state.preview);
        mode = 'preview';
      } else if (state.expression) {
        text = '';
      }

      resultEl.textContent = text;
      resultEl.dataset.mode = mode;
      resultEl.classList.toggle('is-long', text.length > LONG_RESULT);
    },
  };
}
