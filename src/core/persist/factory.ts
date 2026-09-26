/**
 * Kernel backend factory.
 *
 * Picks the right `KernelBackend` for the host runtime:
 *   - Bun                             → SqliteKernelBackend (built-in bun:sqlite)
 *   - Node + better-sqlite3 loadable  → BetterSqliteKernelBackend
 *   - Otherwise                       → SqlJsKernelBackend (pure WASM)
 *
 * Use this when you want runtime portability (e.g. WebContainer, browser,
 * restricted Node hosts). Callers that construct a specific backend directly
 * are unaffected.
 *
 * @module trellis/core/persist
 */

import type { KernelBackend } from './backend.js';

export type KernelBackendKind = 'better-sqlite' | 'bun-sqlite' | 'sqljs';

export interface CreateKernelBackendOptions {
  /**
   * Override automatic detection. Useful for tests and for environments
   * where the runtime check would pick the wrong backend.
   */
  backend?: KernelBackendKind;
  /** Forwarded to `SqlJsKernelBackend` when that backend is selected. */
  sqljs?: { autoFlushEvery?: number };
}

export async function createKernelBackend(
  dbPath: string,
  opts: CreateKernelBackendOptions = {},
): Promise<KernelBackend> {
  const choice = opts.backend ?? detectKernelBackendKind();

  if (choice === 'better-sqlite') {
    const { BetterSqliteKernelBackend } = await import(
      './better-sqlite-backend.js'
    );
    const backend = new BetterSqliteKernelBackend(dbPath);
    backend.init();
    return backend;
  }

  if (choice === 'bun-sqlite') {
    const { SqliteKernelBackend } = await import('./sqlite-backend.js');
    const backend = new SqliteKernelBackend(dbPath);
    backend.init();
    return backend;
  }

  const { SqlJsKernelBackend } = await import('./sqljs-backend.js');
  const backend = await SqlJsKernelBackend.create({
    dbPath,
    autoFlushEvery: opts.sqljs?.autoFlushEvery,
  });
  backend.init();
  return backend;
}

function isBunRuntime(): boolean {
  return (
    typeof process !== 'undefined' &&
    Boolean((process as NodeJS.Process).versions?.bun)
  );
}

/** Runtime backend selection (exported for tests). */
export function detectKernelBackendKind(): KernelBackendKind {
  // better-sqlite3's native addon is not loadable under Bun even when the
  // package resolves — use the built-in bun:sqlite backend instead.
  if (isBunRuntime()) {
    return 'bun-sqlite';
  }

  try {
    const { createRequire } = require('module');
    const req = createRequire(import.meta.url);
    // Actually load the module, not just resolve — native addons fail to load
    // in WebContainer and other restricted environments even when the package
    // is present on disk.
    req('better-sqlite3');
    return 'better-sqlite';
  } catch {
    return 'sqljs';
  }
}
