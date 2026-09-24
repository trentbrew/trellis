/**
 * Kernel backend factory.
 *
 * Picks the right `KernelBackend` for the host runtime:
 *   - Bun                → SqliteKernelBackend (bun:sqlite, native)
 *   - Node + better-sqlite3 installed → BetterSqliteKernelBackend
 *   - Otherwise          → SqlJsKernelBackend (pure WASM, requires `sql.js`)
 *
 * This is an additive helper; existing callsites that construct a specific
 * backend directly are unaffected. Use this when you want runtime portability
 * (e.g. WebContainer demos, browser builds, restricted Node hosts).
 *
 * @module trellis/core/persist
 */

import type { KernelBackend } from './backend.js';

export interface CreateKernelBackendOptions {
  /**
   * Override automatic detection. Useful for tests and for environments
   * where the runtime check would pick the wrong backend.
   */
  backend?: 'bun' | 'better-sqlite' | 'sqljs';
  /** Forwarded to `SqlJsKernelBackend` when that backend is selected. */
  sqljs?: { autoFlushEvery?: number };
}

export async function createKernelBackend(
  dbPath: string,
  opts: CreateKernelBackendOptions = {},
): Promise<KernelBackend> {
  const choice = opts.backend ?? detectBackend();

  if (choice === 'bun') {
    const { SqliteKernelBackend } = await import('./sqlite-backend.js');
    const backend = new SqliteKernelBackend(dbPath);
    backend.init();
    return backend;
  }

  if (choice === 'better-sqlite') {
    const { BetterSqliteKernelBackend } = await import(
      './better-sqlite-backend.js'
    );
    const backend = new BetterSqliteKernelBackend(dbPath);
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

function detectBackend(): 'bun' | 'better-sqlite' | 'sqljs' {
  if (typeof (globalThis as any).Bun !== 'undefined') return 'bun';
  try {
    const { createRequire } = require('module');
    const req = createRequire(import.meta.url);
    req.resolve('better-sqlite3');
    return 'better-sqlite';
  } catch {
    return 'sqljs';
  }
}
