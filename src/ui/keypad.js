/**
 * Data-driven keypad. Buttons are rendered from these definitions, and the
 * keyboard map is derived from the same `keys` arrays, so adding a key means
 * adding one object here.
 */

export const Action = Object.freeze({
  INSERT: 'insert',
  FUNCTION: 'function',
  EVALUATE: 'evaluate',
  CLEAR: 'clear',
  BACKSPACE: 'backspace',
  TOGGLE_SIGN: 'toggle-sign',
});

/**
 * @typedef {object} KeyDefinition
 * @property {string} label text shown on the button
 * @property {string} action one of `Action`
 * @property {string} [value] text inserted or function name
 * @property {string} [variant] visual style: operator | accent | danger | muted
 * @property {string[]} [keys] physical keyboard keys that trigger it
 * @property {string} [ariaLabel] accessible name when the label is a symbol
 * @property {boolean} [wide] spans two columns
 */

/** @type {KeyDefinition[]} */
export const BASIC_KEYS = [
  {
    label: 'AC',
    action: Action.CLEAR,
    variant: 'danger',
    keys: ['Escape', 'Delete'],
    ariaLabel: 'All clear',
  },
  { label: '⌫', action: Action.BACKSPACE, variant: 'muted', keys: ['Backspace'], ariaLabel: 'Backspace' },
  { label: '%', action: Action.INSERT, value: '%', variant: 'muted', keys: ['%'], ariaLabel: 'Percent' },
  { label: '÷', action: Action.INSERT, value: '/', variant: 'operator', keys: ['/'], ariaLabel: 'Divide' },

  { label: '7', action: Action.INSERT, value: '7', keys: ['7'] },
  { label: '8', action: Action.INSERT, value: '8', keys: ['8'] },
  { label: '9', action: Action.INSERT, value: '9', keys: ['9'] },
  {
    label: '×',
    action: Action.INSERT,
    value: '*',
    variant: 'operator',
    keys: ['*', 'x'],
    ariaLabel: 'Multiply',
  },

  { label: '4', action: Action.INSERT, value: '4', keys: ['4'] },
  { label: '5', action: Action.INSERT, value: '5', keys: ['5'] },
  { label: '6', action: Action.INSERT, value: '6', keys: ['6'] },
  { label: '−', action: Action.INSERT, value: '-', variant: 'operator', keys: ['-'], ariaLabel: 'Subtract' },

  { label: '1', action: Action.INSERT, value: '1', keys: ['1'] },
  { label: '2', action: Action.INSERT, value: '2', keys: ['2'] },
  { label: '3', action: Action.INSERT, value: '3', keys: ['3'] },
  { label: '+', action: Action.INSERT, value: '+', variant: 'operator', keys: ['+'], ariaLabel: 'Add' },

  { label: '±', action: Action.TOGGLE_SIGN, variant: 'muted', keys: ['_'], ariaLabel: 'Toggle sign' },
  { label: '0', action: Action.INSERT, value: '0', keys: ['0'] },
  { label: '.', action: Action.INSERT, value: '.', keys: ['.', ','], ariaLabel: 'Decimal point' },
  { label: '=', action: Action.EVALUATE, variant: 'accent', keys: ['Enter', '='], ariaLabel: 'Equals' },
];

/** @type {KeyDefinition[]} */
export const SCIENTIFIC_KEYS = [
  {
    label: '(',
    action: Action.INSERT,
    value: '(',
    variant: 'muted',
    keys: ['('],
    ariaLabel: 'Open parenthesis',
  },
  {
    label: ')',
    action: Action.INSERT,
    value: ')',
    variant: 'muted',
    keys: [')'],
    ariaLabel: 'Close parenthesis',
  },
  { label: 'xʸ', action: Action.INSERT, value: '^', variant: 'muted', keys: ['^'], ariaLabel: 'Power' },
  {
    label: '√',
    action: Action.FUNCTION,
    value: 'sqrt',
    variant: 'muted',
    keys: ['r'],
    ariaLabel: 'Square root',
  },

  { label: 'sin', action: Action.FUNCTION, value: 'sin', variant: 'muted', keys: ['s'] },
  { label: 'cos', action: Action.FUNCTION, value: 'cos', variant: 'muted', keys: ['c'] },
  { label: 'tan', action: Action.FUNCTION, value: 'tan', variant: 'muted', keys: ['t'] },
  { label: 'π', action: Action.INSERT, value: 'pi', variant: 'muted', keys: ['p'], ariaLabel: 'Pi' },

  { label: 'log', action: Action.FUNCTION, value: 'log', variant: 'muted', keys: ['l'] },
  { label: 'ln', action: Action.FUNCTION, value: 'ln', variant: 'muted', keys: ['n'] },
  { label: 'x²', action: Action.INSERT, value: '^2', variant: 'muted', keys: ['q'], ariaLabel: 'Square' },
  {
    label: 'e',
    action: Action.INSERT,
    value: 'e',
    variant: 'muted',
    keys: ['e'],
    ariaLabel: "Euler's number",
  },
];

/**
 * Render a list of key definitions into `container` and wire a single delegated
 * click handler. Returns the button elements keyed by definition for feedback.
 *
 * @param {HTMLElement} container
 * @param {KeyDefinition[]} definitions
 * @param {(definition: KeyDefinition) => void} onPress
 * @returns {Map<KeyDefinition, HTMLButtonElement>}
 */
export function renderKeypad(container, definitions, onPress) {
  const fragment = document.createDocumentFragment();
  const buttons = new Map();

  definitions.forEach((definition, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'key';
    button.textContent = definition.label;
    button.dataset.index = String(index);
    if (definition.variant) button.classList.add(`key--${definition.variant}`);
    if (definition.wide) button.classList.add('key--wide');
    if (definition.ariaLabel) button.setAttribute('aria-label', definition.ariaLabel);
    buttons.set(definition, button);
    fragment.append(button);
  });

  container.replaceChildren(fragment);
  container.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-index]');
    if (!button || !container.contains(button)) return;
    onPress(definitions[Number(button.dataset.index)]);
  });

  return buttons;
}
