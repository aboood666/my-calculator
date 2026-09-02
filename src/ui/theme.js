/**
 * Theme switching: `system` follows `prefers-color-scheme`, `light` / `dark`
 * pin the palette through `data-theme` on <html>. The choice is persisted.
 */

export const THEMES = Object.freeze(['system', 'light', 'dark']);
const STORAGE_KEY = 'theme';

/**
 * @param {HTMLSelectElement} select
 * @param {ReturnType<typeof import('../services/storage.js').createStorage>} storage
 */
export function initTheme(select, storage) {
  const apply = (theme) => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  };

  const saved = storage.get(STORAGE_KEY, 'system');
  const initial = THEMES.includes(saved) ? saved : 'system';
  select.value = initial;
  apply(initial);

  select.addEventListener('change', () => {
    const theme = THEMES.includes(select.value) ? select.value : 'system';
    apply(theme);
    storage.set(STORAGE_KEY, theme);
  });
}
