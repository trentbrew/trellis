/**
 * Hook for managing inspector component state.
 *
 * @module trellis/inspector/hooks/use-inspector-state
 */

import { useState, useEffect } from 'react';
import type { HeadlessCore } from '../../headless/core.js';
import type { InspectorState } from '../types.js';

export interface UseInspectorStateOptions {
  initialState?: Partial<InspectorState>;
  createCore?: (descriptor: any) => HeadlessCore<any>;
  descriptor?: any;
}

export function useInspectorState(options: UseInspectorStateOptions = {}): [InspectorState, React.Dispatch<React.SetStateAction<InspectorState>>] {
  const { initialState, createCore, descriptor } = options;

  const [state, setState] = useState<InspectorState>({
    core: null,
    descriptor: null,
    ...initialState,
  });

  useEffect(() => {
    if (createCore && descriptor) {
      const core = createCore(descriptor);
      setState(prev => ({
        ...prev,
        core,
        descriptor,
      }));
    }
  }, [createCore, descriptor]);

  return [state, setState];
}