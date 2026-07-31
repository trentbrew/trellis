/**
 * Type definitions for the inspector module.
 *
 * @module trellis/inspector/types
 */

import type { HeadlessComponentType, HeadlessCore } from '../headless/core.js';

export interface InspectorState {
  core: HeadlessCore<any> | null;
  descriptor: any;
  // Component-specific state properties can be added here
  // This is a generic state interface that can be extended per component
  [key: string]: any;
}

export interface InspectorConfig {
  componentType: HeadlessComponentType;
  name: string;
  description?: string;
  defaultDescriptor?: any;
}

export interface InspectorControls {
  [key: string]: {
    label?: string;
    type: 'text' | 'checkbox' | 'select' | 'range' | 'color' | 'array' | 'object';
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
  };
}

export type Framework = 'react' | 'vue' | 'svelte' | 'vanilla';