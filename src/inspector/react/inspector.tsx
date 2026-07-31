import React, { useEffect, useRef } from 'react';
import { inspectorRegistry } from './registry/inspector-registry.js';
import { useInspectorState } from './hooks/use-inspector-state.js';
import type { InspectorState } from './types.js';
import { ControlPanel } from './control-panel.js';

export interface InspectorProps {
  componentType: string;
  descriptor?: any;
  initialState?: Partial<InspectorState>;
  controls?: Record<string, any>;
  onStateChange?: (state: InspectorState) => void;
  height?: string | number;
  showControls?: boolean;
}

export function Inspector(props: InspectorProps) {
  const { componentType, descriptor, initialState, controls, onStateChange, height, showControls } = props;
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

  const RenderComponent = registeredComponent.getRenderer('react');

  return (
    <div style={{ display: 'flex', height: height || '400px', gap: '16px', padding: '16px' }}>
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