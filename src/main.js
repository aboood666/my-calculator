/**
 * Application entry point: wires the DOM to the calculator engine.
 * All behaviour lives in `core/`; this file only translates events to
 * engine calls and snapshots to renders.
 */

import { Calculator } from './core/calculator.js';
import { AngleMode } from './core/evaluator.js';
import { formatNumber } from './core/format.js';
import { createStorage } from './services/storage.js';
import { createDisplay } from './ui/display.js';
import { createHistoryPanel } from './ui/history.js';
import { bindKeyboard } from './ui/keyboard.js';
import { Action, BASIC_KEYS, SCIENTIFIC_KEYS, renderKeypad } from './ui/keypad.js';
import { initTheme } from './ui/theme.js';

const STORAGE_NAMESPACE = 'my-calculator';
const StorageKey = Object.freeze({ HISTORY: 'history', ANGLE_MODE: 'angleMode', MODE: 'mode' });
const Mode = Object.freeze({ BASIC: 'basic', SCIENTIFIC: 'scientific' });
const STATUS_TIMEOUT_MS = 1500;

const $ = (selector) => {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

function main() {
  const storage = createStorage(STORAGE_NAMESPACE);
  const calculator = new Calculator({
    history: storage.get(StorageKey.HISTORY, []),
    angleMode: storage.get(StorageKey.ANGLE_MODE, AngleMode.DEGREES),
  });

  const app = $('.calculator');
  const scientificPanel = $('#scientific-keys');
  const modeToggle = $('#mode-toggle');
  const angleGroup = $('#angle-mode');
  const status = $('#status');

  const display = createDisplay({ expressionEl: $('#expression'), resultEl: $('#result') });
  const history = createHistoryPanel(
    { listEl: $('#history-list'), emptyEl: $('#history-empty'), clearButton: $('#clear-history') },
    {
      onRecallResult: (entry) => calculator.recallResult(entry),
      onRecallExpression: (entry) => calculator.recallExpression(entry),
      onClear: () => calculator.clearHistory(),
    },
  );

  const dispatch = (definition) => {
    switch (definition.action) {
      case Action.INSERT:
        calculator.input(definition.value);
        break;
      case Action.FUNCTION:
        calculator.applyFunction(definition.value);
        break;
      case Action.EVALUATE:
        calculator.evaluate();
        break;
      case Action.CLEAR:
        calculator.clearAll();
        break;
      case Action.BACKSPACE:
        calculator.backspace();
        break;
      case Action.TOGGLE_SIGN:
        calculator.toggleSign();
        break;
      default:
        break;
    }
  };

  const basicButtons = renderKeypad($('#basic-keys'), BASIC_KEYS, dispatch);
  const scientificButtons = renderKeypad(scientificPanel, SCIENTIFIC_KEYS, dispatch);
  const buttonFor = (definition) => basicButtons.get(definition) ?? scientificButtons.get(definition);

  const isScientific = () => app.dataset.mode === Mode.SCIENTIFIC;
  const setMode = (mode) => {
    app.dataset.mode = mode;
    const scientific = mode === Mode.SCIENTIFIC;
    scientificPanel.hidden = !scientific;
    angleGroup.hidden = !scientific;
    modeToggle.setAttribute('aria-pressed', String(scientific));
    modeToggle.textContent = scientific ? 'Basic' : 'Scientific';
    storage.set(StorageKey.MODE, mode);
  };

  setMode(storage.get(StorageKey.MODE, Mode.BASIC) === Mode.SCIENTIFIC ? Mode.SCIENTIFIC : Mode.BASIC);
  modeToggle.addEventListener('click', () => setMode(isScientific() ? Mode.BASIC : Mode.SCIENTIFIC));

  bindKeyboard([...BASIC_KEYS, ...SCIENTIFIC_KEYS], {
    onPress: dispatch,
    buttonFor,
    // Scientific shortcuts (letters, parentheses) only apply while that panel is visible.
    isEnabled: (definition) => !SCIENTIFIC_KEYS.includes(definition) || isScientific(),
  });

  angleGroup.addEventListener('change', (event) => {
    if (event.target.name === 'angle') calculator.setAngleMode(event.target.value);
  });

  let statusTimer = 0;
  const announce = (message) => {
    status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status.textContent = ''), STATUS_TIMEOUT_MS);
  };

  $('#copy').addEventListener('click', async () => {
    const { result, preview, error } = calculator.state;
    const value = error ? null : (result ?? preview);
    if (value === null) return announce('Nothing to copy');
    try {
      await navigator.clipboard.writeText(String(value));
      announce(`Copied ${formatNumber(value)}`);
    } catch {
      announce('Copy failed');
    }
  });

  initTheme($('#theme'), storage);

  calculator.subscribe((state) => {
    display.render(state);
    history.render(state.history);
    storage.set(StorageKey.HISTORY, state.history);
    storage.set(StorageKey.ANGLE_MODE, state.angleMode);
    angleGroup.querySelector(`input[value="${state.angleMode}"]`).checked = true;
  });

  // Initial paint from the restored state.
  const initial = calculator.state;
  display.render(initial);
  history.render(initial.history);
  angleGroup.querySelector(`input[value="${initial.angleMode}"]`).checked = true;
}

main();
