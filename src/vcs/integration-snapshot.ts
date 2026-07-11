/**
 * Persisted integration materialization snapshot.
 *
 * Stores EAV state at a journal tail hash so CLI cold starts replay only
 * ops appended since the last snapshot instead of the full integration journal.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import type { CatalogEntry, Fact, Link } from '../core/store/eav-store.js';
import type { EAVStore } from '../core/store/eav-store.js';
import type { VcsOp } from './types.js';

export const INTEGRATION_SNAPSHOT_FILE = 'integration-snapshot.json';
export const INTEGRATION_SNAPSHOT_VERSION = 1;

export interface PersistedIntegrationSnapshot {
  version: typeof INTEGRATION_SNAPSHOT_VERSION;
  tailHash: string;
  store: {
    facts: Fact[];
    links: Link[];
    catalog: CatalogEntry[];
  };
}

export function integrationSnapshotPath(trellisDir: string): string {
  return join(trellisDir, INTEGRATION_SNAPSHOT_FILE);
}

export function snapshotsEnabled(): boolean {
  return process.env.TRELLIS_NO_SNAPSHOT !== '1';
}

/** Find the last journal index whose op hash equals `tailHash`. */
export function findTailIndex(ops: VcsOp[], tailHash: string): number {
  for (let i = ops.length - 1; i >= 0; i--) {
    if (ops[i]?.hash === tailHash) return i;
  }
  return -1;
}

export function loadPersistedSnapshot(
  snapshotPath: string,
): PersistedIntegrationSnapshot | null {
  if (!existsSync(snapshotPath)) return null;

  try {
    const raw = readFileSync(snapshotPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedIntegrationSnapshot>;
    if (parsed.version !== INTEGRATION_SNAPSHOT_VERSION) return null;
    if (typeof parsed.tailHash !== 'string' || !parsed.tailHash) return null;
    if (!parsed.store || !Array.isArray(parsed.store.facts)) return null;
    if (!Array.isArray(parsed.store.links)) return null;
    return parsed as PersistedIntegrationSnapshot;
  } catch {
    return null;
  }
}

export function savePersistedSnapshot(
  snapshotPath: string,
  tailHash: string | undefined,
  store: EAVStore,
): void {
  if (!snapshotsEnabled() || !tailHash) return;

  const payload: PersistedIntegrationSnapshot = {
    version: INTEGRATION_SNAPSHOT_VERSION,
    tailHash,
    store: store.snapshot(),
  };

  const dir = dirname(snapshotPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const tempPath = `${snapshotPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(payload));
  renameSync(tempPath, snapshotPath);
}
