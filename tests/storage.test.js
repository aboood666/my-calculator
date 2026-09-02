import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createStorage } from '../src/services/storage.js';

function memoryBackend() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    map,
  };
}

describe('createStorage', () => {
  it('namespaces keys and round-trips JSON', () => {
    const backend = memoryBackend();
    const storage = createStorage('calc', backend);
    storage.set('history', [{ a: 1 }]);
    assert.deepEqual(storage.get('history'), [{ a: 1 }]);
    assert.ok(backend.map.has('calc:history'));
  });

  it('returns the fallback for missing or corrupt values', () => {
    const backend = memoryBackend();
    const storage = createStorage('calc', backend);
    assert.equal(storage.get('missing', 'default'), 'default');
    backend.setItem('calc:broken', '{not json');
    assert.equal(storage.get('broken', 42), 42);
  });

  it('degrades gracefully when no backend is available', () => {
    const storage = createStorage('calc', null);
    assert.equal(storage.set('key', 1), false);
    assert.equal(storage.get('key', 'fallback'), 'fallback');
    assert.doesNotThrow(() => storage.remove('key'));
  });

  it('swallows backend failures', () => {
    const storage = createStorage('calc', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    assert.equal(storage.get('k', 'x'), 'x');
    assert.equal(storage.set('k', 1), false);
    assert.doesNotThrow(() => storage.remove('k'));
  });
});
