/**
 * Inspector registry — component registry for headless UI components.
 *
 * The inspector registry maintains mappings between component types and their
 * visual renderers for different frameworks. This enables the inspector to
 * render headless components in isolated preview environments.
 *
 * @module trellis/inspector/registry
 */

import type { HeadlessComponentType, HeadlessCore } from '../../headless/core.js';

export interface VisualRenderer {
  /** Framework identifier */
  framework: 'react' | 'vue' | 'svelte' | 'vanilla';
  /** Function that creates a visual component for the given core and descriptor */
  render(core: HeadlessCore<any>, descriptor: any): any;
}

export interface RegisteredComponent {
  /** Component type */
  type: HeadlessComponentType;
  /** Display name for UI purposes */
  name: string;
  /** Description of the component */
  description?: string;
  /** Default descriptor for the component */
  defaultDescriptor?: any;
  /** Visual renderers for different frameworks */
  renderers: VisualRenderer[];
}

class InspectorRegistry {
  private components = new Map<HeadlessComponentType, RegisteredComponent>();

  /**
   * Register a headless component for inspection.
   * 
   * @param component - The component to register
   */
  register(component: RegisteredComponent): void {
    this.components.set(component.type, component);
  }

  /**
   * Get a registered component by type.
   * 
   * @param type - The component type
   * @returns The registered component or undefined if not found
   */
  getComponent(type: HeadlessComponentType): RegisteredComponent | undefined {
    return this.components.get(type);
  }

  /**
   * Get all registered component types.
   * 
   * @returns Array of registered component types
   */
  getComponentTypes(): HeadlessComponentType[] {
    return Array.from(this.components.keys());
  }

  /**
   * Check if a component type is registered.
   * 
   * @param type - The component type
   * @returns true if registered, false otherwise
   */
  isRegistered(type: HeadlessComponentType): boolean {
    return this.components.has(type);
  }

  /**
   * Get the visual renderer for a specific component type and framework.
   * 
   * @param type - The component type
   * @param framework - The target framework
   * @returns The visual renderer or undefined if not available for the framework
   */
  getRenderer(type: HeadlessComponentType, framework: string): VisualRenderer | undefined {
    const component = this.components.get(type);
    if (!component) return undefined;
    return component.renderers.find(r => r.framework === framework);
  }

  /**
   * Clear all registered components (useful for testing).
   */
  clear(): void {
    this.components.clear();
  }
}

export const inspectorRegistry = new InspectorRegistry();