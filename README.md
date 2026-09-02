# My Calculator

A fast, keyboard-friendly calculator built with plain HTML, CSS and JavaScript. No framework, no build step, fully unit tested.

## Features

- **Real expression engine** with operator precedence, parentheses, right-associative powers, unary minus and implicit multiplication (`2(3+4)`, `2π`).
- **Scientific mode**: `sin` `cos` `tan` `log` `ln` `√` `xʸ` `x²` `π` `e`, with a DEG / RAD switch.
- **Live preview** of the result while you type, and a typed error message (division by zero, syntax, domain errors) instead of `NaN`.
- **Smart input**: no double operators, one decimal point per number, auto-closed parentheses, chaining from the last result after `=`.
- **History panel** (last 50 calculations) persisted in `localStorage`. Click a result to reuse it, or the expression to edit it.
- **Full keyboard support** derived from the same key definitions as the on-screen buttons.
- **Light / dark / system theme**, reduced-motion support, accessible labels and live regions.
- **Precise results**: `0.1 + 0.2` shows `0.3`, `sin(180°)` shows `0`.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install      # dev tooling only (eslint, prettier); the app itself has no dependencies
npm start        # serves http://localhost:5173
```

The app uses ES modules, so it must be served over HTTP rather than opened as a `file://` URL. `npm start` runs a tiny zero-dependency server from [scripts/serve.mjs](scripts/serve.mjs). Any other static server (VS Code Live Server, `python -m http.server`) works too.

## Scripts

| Command                | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm start`            | Serve the app locally                            |
| `npm test`             | Run the unit tests with the built-in Node runner |
| `npm run test:watch`   | Re-run tests on change                           |
| `npm run lint`         | ESLint                                           |
| `npm run format`       | Prettier (write)                                 |
| `npm run format:check` | Prettier (verify)                                |
| `npm run check`        | Lint + format check + tests (what CI runs)       |

## Project structure

```
index.html              Markup only; keys are rendered from data
styles/
  tokens.css            Design tokens, light + dark palettes
  base.css              Reset, focus styles, reduced motion
  calculator.css        Layout and components
src/
  main.js               Entry point: wires DOM to the engine
  core/                 Pure, DOM-free, unit-tested logic
    tokenizer.js        String → tokens (symbols, unary minus, implicit ×)
    parser.js           Tokens → postfix (shunting-yard)
    evaluator.js        Postfix → number, precision handling, functions
    calculator.js       State machine: input rules, history, chaining
    format.js           Number and expression formatting for display
    errors.js           Typed CalculatorError and error codes
  ui/
    keypad.js           Key definitions + renderer (single source of truth)
    keyboard.js         Physical keyboard bindings derived from keypad.js
    display.js          Expression / result rendering
    history.js          History panel
    theme.js            Theme switcher
  services/
    storage.js          Guarded, namespaced localStorage wrapper
tests/                  node:test suites for every core module
scripts/serve.mjs       Dev server
```

### How a keystroke flows

1. A click or key press resolves to a **key definition** from [src/ui/keypad.js](src/ui/keypad.js).
2. `main.js` dispatches it to the **`Calculator`** state machine.
3. The calculator validates the input, updates its expression, computes a preview, and notifies subscribers with an **immutable snapshot**.
4. The display and history panel **re-render from the snapshot**, and the snapshot is persisted.

Because every rule lives in `core/`, all of it is covered by tests that run in under a second without a browser.

## Extending

- **Add a key**: append one object to `BASIC_KEYS` or `SCIENTIFIC_KEYS`. The button, its styling variant and its keyboard shortcut all come from that object.
- **Add a function**: add the name to `FUNCTION_NAMES` in [src/core/tokenizer.js](src/core/tokenizer.js) and its implementation to `createFunctions` in [src/core/evaluator.js](src/core/evaluator.js), then add a key and a test.
- **Add an operator**: register it in `BINARY_OPERATORS` and the `OPERATORS` precedence table in [src/core/parser.js](src/core/parser.js), plus its implementation in the evaluator.

## Keyboard shortcuts

| Keys                                | Action                      |
| ----------------------------------- | --------------------------- |
| `0`–`9` `.` `,`                     | Digits and decimal point    |
| `+` `-` `*` `x` `/` `%`             | Operators                   |
| `Enter` `=`                         | Evaluate                    |
| `Backspace`                         | Delete last token           |
| `Esc` `Delete`                      | All clear                   |
| `_`                                 | Toggle sign                 |
| `(` `)` `^`                         | Scientific mode only        |
| `r` `s` `c` `t` `l` `n` `q` `p` `e` | √ sin cos tan log ln x² π e |
