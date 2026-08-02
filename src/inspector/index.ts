/**
 * Headless component inspector — component index + isolated preview
 * playground for headless UI components (ADR 0034).
 *
 * The registry indexes every headless component (metadata, core factory,
 * action specs, per-framework renderers). The browser gallery
 * (`demo/wedge-smoke`) and Studio tooling consume it to render any
 * component in isolation with a common inspect wrapper around it — state
 * JSON, action buttons, and a live view — for exploration without a full
 * application context.
 *
 * @module trellis/inspector
 */

export { inspectorRegistry } from './registry/inspector-registry.js';
export type {
  GalleryAction,
  HeadlessFramework,
  RegisteredComponent,
  VisualRenderer,
} from './registry/inspector-registry.js';
