/**
 * Inspector registry — component index for headless UI (ADR 0034).
 *
 * The registry maps every headless component type to its index metadata:
 * name, description, a default config, a core factory, and per-framework
 * visual renderers. It is what the browser gallery (`demo/wedge-smoke`)
 * and future Studio tooling consume to render any component in isolation
 * with a common inspect wrapper around it.
 *
 * Cores are never instantiated by the registry itself — entries carry the
 * factory (`create`), so one entry renders identically in the gallery,
 * in tests, and in Studio. Only the `vanilla` renderer is implemented
 * today (it mounts a live view into a DOM container); framework renderers
 * can be added as `framework: 'react' | 'vue' | 'svelte'` without
 * changing the consumer contract.
 *
 * @module trellis/inspector/registry
 */

import type { HeadlessComponentType, HeadlessCore } from '../../headless/core.js';

/** Framework identifiers for visual renderers. */
export type HeadlessFramework = 'react' | 'vue' | 'svelte' | 'vanilla';

/** One button in the inspect wrapper's action panel. */
export interface GalleryAction<TCore = HeadlessCore<unknown>> {
  /** Button label (e.g. "Undo"). */
  label: string;
  /** Invoke the action on the core. */
  run(core: TCore): void;
  /** Derived enabled predicate (e.g. canUndo) — button disabled when false. */
  enabled?(core: TCore): boolean;
}

/**
 * A visual renderer for one framework. `render` mounts a live view of
 * the core into `container` and returns a cleanup; the renderer owns all
 * subscriptions it makes.
 */
export interface VisualRenderer<TConfig = unknown, TCore extends HeadlessCore<unknown> = HeadlessCore<unknown>> {
  framework: HeadlessFramework;
  render(core: TCore, container: HTMLElement, config: TConfig): () => void;
}

/** One indexed component: metadata + factory + actions + renderers. */
export interface RegisteredComponent<
  TConfig = unknown,
  TCore extends HeadlessCore<unknown> = HeadlessCore<unknown>,
> {
  /** Registry identity (ADR 0034 §4 component list). */
  type: HeadlessComponentType;
  /** Display name for the index sidebar. */
  name: string;
  /** One-line description shown under the name. */
  description?: string;
  /** Config used to create the core in isolated previews. */
  defaultConfig?: TConfig;
  /** Create a fresh core from a config (isolated preview). */
  create(config: TConfig): TCore;
  /** Inspect-wrapper action buttons (invoked against the core). */
  actions?: GalleryAction<TCore>[];
  /** Framework renderers; the gallery uses the vanilla one. */
  renderers: VisualRenderer<TConfig, TCore>[];
}

export class InspectorRegistry {
  private components = new Map<HeadlessComponentType, RegisteredComponent>();

  /**
   * Register a component for inspection. A later register for the same
   * type replaces the earlier entry.
   */
  register<TConfig, TCore extends HeadlessCore<unknown>>(
    component: RegisteredComponent<TConfig, TCore>,
  ): void {
    this.components.set(
      component.type,
      component as unknown as RegisteredComponent,
    );
  }

  /** Get a registered component by type, or undefined. */
  getComponent(type: HeadlessComponentType): RegisteredComponent | undefined {
    return this.components.get(type);
  }

  /** All registered components, ordered by name (sidebar order). */
  listComponents(): RegisteredComponent[] {
    return [...this.components.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

/** Shared singleton — the gallery and Studio tooling both use this. */
export const inspectorRegistry = new InspectorRegistry();
