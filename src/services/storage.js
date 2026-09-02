/**
 * Namespaced, JSON-serialised wrapper around `localStorage`.
 * Every call is guarded: private browsing, quota errors and corrupt values
 * fall back to defaults instead of breaking the app.
 */

function resolveBackend() {
  try {
    const probeKey = '__calc_probe__';
    globalThis.localStorage.setItem(probeKey, '1');
    globalThis.localStorage.removeItem(probeKey);
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * @param {string} namespace prefix applied to every key
 * @param {Storage | null} [backend] override for tests
 */
export function createStorage(namespace, backend = resolveBackend()) {
  const keyFor = (key) => `${namespace}:${key}`;

  return {
    get(key, fallback = null) {
      if (!backend) return fallback;
      try {
        const raw = backend.getItem(keyFor(key));
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      if (!backend) return false;
      try {
        backend.setItem(keyFor(key), JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    remove(key) {
      if (!backend) return;
      try {
        backend.removeItem(keyFor(key));
      } catch {
        // Ignore: storage is a convenience, never a requirement.
      }
    },
  };
}
