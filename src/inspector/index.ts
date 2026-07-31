/**
 * Headless component inspector — isolated preview playground for headless UI components.
 *
 * The inspector showcases headless components in isolation, with state controls and
 * framework-specific renderers. It enables visual regression testing, documentation,
 * and interactive exploration of component behavior without full application context.
 *
 * @module trellis/inspector
 */

export { Inspector } from './inspector.js';
export { useInspectorState } from './hooks/use-inspector-state.js';
export { inspectorRegistry } from './registry/inspector-registry.js';
export type {
  InspectorConfig,
  InspectorState,
  InspectorControls,
  Framework,
  Story,
} from './types.js';