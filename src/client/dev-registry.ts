/**
 * Dev-only runtime probe registry for Trellis apps.
 * @module trellis/client/dev-registry
 */

export type FractalShellName = 'node' | 'row' | 'card';

export interface TrellisFractalDev {
  vantage: () => number;
  shell: () => FractalShellName;
  thingId: () => string | null;
  lane: () => string;
}

export interface TrellisDevRegistry {
  version: 1;
  lane: () => string | null;
  fractal?: TrellisFractalDev;
}

declare global {
  interface Window {
    __TRELLIS_DEV__?: TrellisDevRegistry;
  }
}

function isDevEnvironment(): boolean {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return false;
  }
  try {
    const meta = import.meta as ImportMeta & { env?: { PROD?: boolean; DEV?: boolean } };
    if (meta.env?.PROD) return false;
    if (meta.env?.DEV) return true;
  } catch {
    // not a bundler context
  }
  return typeof process === 'undefined' || process.env.NODE_ENV !== 'production';
}

export function registerDevRegistry(registry: TrellisDevRegistry): void {
  if (!isDevEnvironment()) return;
  if (typeof globalThis.window === 'undefined') return;
  window.__TRELLIS_DEV__ = registry;
}

export function getDevRegistry(): TrellisDevRegistry | null {
  if (typeof globalThis.window === 'undefined') return null;
  return window.__TRELLIS_DEV__ ?? null;
}

export function clearDevRegistry(): void {
  if (typeof globalThis.window === 'undefined') return;
  delete window.__TRELLIS_DEV__;
}
