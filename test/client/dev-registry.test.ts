import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearDevRegistry,
  getDevRegistry,
  registerDevRegistry,
  type TrellisDevRegistry,
} from '../../src/client/dev-registry.js';

describe('dev-registry', () => {
  const registry: TrellisDevRegistry = {
    version: 1,
    lane: () => 'main',
    fractal: {
      vantage: () => 8,
      shell: () => 'card',
      thingId: () => 'entity:test',
      lane: () => 'main',
    },
  };

  beforeEach(() => {
    vi.stubGlobal('window', {} as Window & typeof globalThis);
    clearDevRegistry();
  });

  afterEach(() => {
    clearDevRegistry();
    vi.unstubAllGlobals();
  });

  it('registerDevRegistry round-trips in dev/test', () => {
    registerDevRegistry(registry);
    const got = getDevRegistry();
    expect(got?.version).toBe(1);
    expect(got?.lane()).toBe('main');
    expect(got?.fractal?.shell()).toBe('card');
    expect(got?.fractal?.vantage()).toBe(8);
  });

  it('clearDevRegistry removes window hook', () => {
    registerDevRegistry(registry);
    clearDevRegistry();
    expect(getDevRegistry()).toBeNull();
  });
});
