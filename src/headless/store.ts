/**
 * Headless bridge helpers (ADR 0034 §2/§3) — lifted from the forms adapters.
 *
 * All helpers are framework-free: they only consume the
 * `HeadlessCore` contract. Adapters that need framework reactivity
 * (Vue `reactive`, React `useSyncExternalStore`) still call their framework
 * themselves; these helpers cover the shareable parts.
 *
 * @module trellis/headless
 */

import type { HeadlessCore } from './core.js';

/**
 * Expose a core through the Svelte store contract (`subscribe(run)` with
 * `run` invoked immediately). Takes no dependency on the svelte package —
 * works across Svelte 4/5 (see `src/svelte/stores.ts`).
 *
 * @param core    the headless core
 * @param getter  project state to the store value (default: whole state)
 */
export function toSvelteStore<S, T = S>(
  core: HeadlessCore<S>,
  getter: (state: S) => T = (s) => s as unknown as T,
): { subscribe(run: (value: T) => void): () => void } {
  return {
    subscribe(run: (value: T) => void): () => void {
      run(getter(core.state));
      return core.subscribe(() => run(getter(core.state)));
    },
  };
}

/**
 * Mirror a core's state into an existing mutable target object (a Vue
 * `reactive()` object, a ref, a plain holder) on every mutation. Returns
 * the unsubscribe function.
 */
export function syncFromCore<S extends object>(
  target: S,
  core: HeadlessCore<S>,
): () => void {
  return core.subscribe(() => {
    Object.assign(target, core.state);
  });
}
