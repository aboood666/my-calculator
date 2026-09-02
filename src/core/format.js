/**
 * Presentation helpers. Pure functions, so they are unit tested without a DOM.
 */

const MAX_FRACTION_DIGITS = 10;
const EXPONENT_UPPER = 1e15;
const EXPONENT_LOWER = 1e-6;

const groupedFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: MAX_FRACTION_DIGITS,
});

/** Format a numeric result for the display: digit grouping, trimmed decimals, exponent for extremes. */
export function formatNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Error';
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude >= EXPONENT_UPPER || magnitude < EXPONENT_LOWER)) {
    return value.toExponential(8).replace(/\.?0+e/, 'e');
  }
  return groupedFormatter.format(value);
}

/** Numbers written in exponent form (`1e-7`) must keep their ASCII sign. */
const EXPONENT_NUMBER = /(\d+\.?\d*e[+-]?\d+)/i;

const GLYPHS = [
  [/\*/g, '×'],
  [/\//g, '÷'],
  [/-/g, '−'],
  [/sqrt/g, '√'],
  [/pi/g, 'π'],
];

/** Render an expression with typographic operator glyphs (`2*3-1` → `2×3−1`). */
export function formatExpression(expression) {
  return expression
    .split(EXPONENT_NUMBER)
    .map((chunk, index) =>
      // Odd indexes are the captured exponent numbers; leave them untouched.
      index % 2 === 1
        ? chunk
        : GLYPHS.reduce((text, [pattern, glyph]) => text.replace(pattern, glyph), chunk),
    )
    .join('');
}
