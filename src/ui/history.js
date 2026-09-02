/**
 * History side panel. Re-rendered from the snapshot on every change; the list is
 * capped at `MAX_HISTORY`, so a full re-render stays cheap.
 */

import { formatExpression, formatNumber } from '../core/format.js';

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/**
 * @param {{ listEl: HTMLElement, emptyEl: HTMLElement, clearButton: HTMLButtonElement }} elements
 * @param {{ onRecallResult: (entry: object) => void, onRecallExpression: (entry: object) => void, onClear: () => void }} handlers
 */
export function createHistoryPanel(
  { listEl, emptyEl, clearButton },
  { onRecallResult, onRecallExpression, onClear },
) {
  let entries = [];

  listEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-index]');
    if (!button) return;
    const entry = entries[Number(button.dataset.index)];
    if (!entry) return;
    if (button.dataset.role === 'expression') onRecallExpression(entry);
    else onRecallResult(entry);
  });

  clearButton.addEventListener('click', onClear);

  return {
    render(history) {
      entries = history;
      const isEmpty = history.length === 0;
      emptyEl.hidden = !isEmpty;
      clearButton.disabled = isEmpty;

      const fragment = document.createDocumentFragment();
      history.forEach((entry, index) => {
        const item = document.createElement('li');
        item.className = 'history__item';

        const expressionButton = document.createElement('button');
        expressionButton.type = 'button';
        expressionButton.className = 'history__expression';
        expressionButton.dataset.index = String(index);
        expressionButton.dataset.role = 'expression';
        expressionButton.title = 'Edit this expression';
        expressionButton.textContent = formatExpression(entry.expression);

        const resultButton = document.createElement('button');
        resultButton.type = 'button';
        resultButton.className = 'history__result';
        resultButton.dataset.index = String(index);
        resultButton.dataset.role = 'result';
        resultButton.title = 'Use this result';
        resultButton.textContent = `= ${formatNumber(entry.result)}`;

        const time = document.createElement('time');
        time.className = 'history__time';
        time.dateTime = new Date(entry.timestamp).toISOString();
        time.textContent = timeFormatter.format(entry.timestamp);

        item.append(expressionButton, resultButton, time);
        fragment.append(item);
      });

      listEl.replaceChildren(fragment);
    },
  };
}
