/**
 * Kernel backend factory — runtime detection.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { detectKernelBackendKind } from '../../src/core/persist/factory.js';

describe('detectKernelBackendKind', () => {
  const originalBun = process.versions.bun;

  afterEach(() => {
    if (originalBun !== undefined) {
      process.versions.bun = originalBun;
    } else {
      delete (process.versions as { bun?: string }).bun;
    }
    vi.unstubAllGlobals();
  });

  it('selects bun-sqlite when running under Bun', () => {
    process.versions.bun = '1.4.0';
    expect(detectKernelBackendKind()).toBe('bun-sqlite');
  });

  it('selects better-sqlite or sqljs under Node (not bun-sqlite)', () => {
    delete (process.versions as { bun?: string }).bun;
    const kind = detectKernelBackendKind();
    expect(kind === 'better-sqlite' || kind === 'sqljs').toBe(true);
    expect(kind).not.toBe('bun-sqlite');
  });
});
