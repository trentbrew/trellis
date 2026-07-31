import { createElement, useEffect, useRef } from 'react';
import type { HeadlessComponentType, HeadlessCore } from '../headless/core.js';
import { inspectorRegistry } from './registry/inspector-registry.js';
import type { InspectorConfig, InspectorState, Framework } from './types.js';
import { useInspectorState } from './hooks/use-inspector-state.js';

export { Inspector } from './inspector.js';
export { useInspectorState } from './hooks/use-inspector-state.js';

export interface InspectorProps {
  /** Component type to inspect (must be registered) */
  componentType: HeadlessComponentType;
  /** Optional initial descriptor for the component */
  descriptor?: any;
  /** Framework to render with */
  framework?: Framework;
  /** Initial state overrides */
  initialState?: Partial<InspectorState>;
  /** Control panel configuration */
  controls?: Record<string, any>;
  /** Callback when state changes */
  onStateChange?: (state: InspectorState) => void;
  /** Height of the inspector container */
  height?: string | number;
  /** Whether to show the control panel */
  showControls?: boolean;
}

export function Inspector({
  componentType,
  descriptor,
  framework = 'react',
  initialState,
  controls,
  onStateChange,
  height = '400px',
  showControls = true,
}: InspectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useInspectorState(initialState);
  const registeredComponent = inspectorRegistry.getComponent(componentType);

  useEffect(() => {
    if (registeredComponent && descriptor) {
      const core = registeredComponent.createCore(descriptor);
      setState((prev) => ({
        ...prev,
        core,
        descriptor,
      }));
    }
  }, [componentType, descriptor, registeredComponent, setState]);

  if (!registeredComponent) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        Component type "{componentType}" is not registered. Please register it first.
      </div>
    );
  }

  if (!state.core) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading component...
      </div>
    );
  }

  const RenderComponent = registeredComponent.getRenderer(framework);

  return (
    <div style={{ display: 'flex', height, gap: '16px', padding: '16px' }}>
      {showControls && (
        <ControlPanel
          state={state}
          setState={setState}
          controls={controls}
          componentType={componentType}
        />
      )}
      <div
        ref={containerRef}
        style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}
      >
        <RenderComponent core={state.core} descriptor={state.descriptor} />
      </div>
    </div>
  );
}