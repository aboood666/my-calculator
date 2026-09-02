/**
 * Physical keyboard support. The key → definition map is derived from the
 * keypad definitions, so both input methods always stay in sync.
 */

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const PRESS_FEEDBACK_MS = 120;

/**
 * @param {Array<import('./keypad.js').KeyDefinition>} definitions
 * @param {{
 *   onPress: (definition: import('./keypad.js').KeyDefinition) => void,
 *   isEnabled?: (definition: import('./keypad.js').KeyDefinition) => boolean,
 *   buttonFor?: (definition: import('./keypad.js').KeyDefinition) => HTMLButtonElement | undefined,
 * }} handlers
 * @returns {() => void} teardown
 */
export function bindKeyboard(definitions, { onPress, isEnabled = () => true, buttonFor = () => undefined }) {
  const keyMap = new Map();
  for (const definition of definitions) {
    for (const key of definition.keys ?? []) {
      if (!keyMap.has(key)) keyMap.set(key, definition);
    }
  }

  const handleKeydown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (EDITABLE_TAGS.has(event.target?.tagName) || event.target?.isContentEditable) return;

    const definition = keyMap.get(event.key) ?? keyMap.get(event.key.toLowerCase());
    if (!definition || !isEnabled(definition)) return;

    event.preventDefault();
    onPress(definition);

    const button = buttonFor(definition);
    if (button) {
      button.classList.add('is-pressed');
      setTimeout(() => button.classList.remove('is-pressed'), PRESS_FEEDBACK_MS);
    }
  };

  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}
