/**
 * Headless UI Convention — shared furniture (ADR 0034).
 *
 * The convention: every UI domain ships as a framework-free behavior core
 * (`HeadlessCore`) plus thin adapters for react/vue/svelte/vanilla.
 * This module defines the bridge contract and the component-registry types
 * that domains share. It imports nothing from any framework.
 *
 * @module trellis/headless
 */

/**
 * The core contract every domain satisfies:
 * - `state` — pull: latest state, with derived fields recomputed on read
 *   (e.g. form `isValid`/`isDirty`, palette `empty`/`groups`).
 * - `subscribe` — push: listener fires after every state mutation.
 * - domain accessors — e.g. `field(name)`, `results()`, `marks()`.
 */
export interface HeadlessCore<S> {
  readonly state: S;
  subscribe(listener: () => void): () => void;
}

/** Registry identity for every headless UI affordance (ADR 0034 §4). */
export type HeadlessComponentType =
  | 'form'
  | 'palette'
  | 'dialog'
  | 'timeline'
  | 'richtext'
  | 'toast'
  | 'menu'
  | 'combobox'
  | 'upload'
  | 'table'
  | 'code'
  | 'colorpicker'
  | 'flow'
  | 'layout'
  | 'kanban'
  | 'undo-history';

/**
 * Registry entry: one framework's visual component for a headless type.
 * The `component` is framework-specific (React element factory, Vue
 * component, svelte file, …); the registry maps `type + descriptor + core`
 * to it. Cores are never instantiated inside visual components — they are
 * passed in, so one descriptor renders identically under every framework.
 */
export interface RegistryEntry {
  type: HeadlessComponentType;
  component: unknown;
}
