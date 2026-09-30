/**
 * Minted FileNode / DirectoryNode identity (TRL-456).
 *
 * Path is a mutable attribute, not the entity id. Legacy graphs used
 * `file:<path>` / `dir:<path>`; new ops carry minted ids on the payload.
 */

import type { EAVStore } from '../core/store/eav-store.js';
import type { VcsOp } from './types.js';

export const MINTED_FILE_PREFIX = 'file:f_';
export const MINTED_DIR_PREFIX = 'dir:d_';

/** @deprecated Path-derived id — legacy graphs only. Prefer minted ids + path index. */
export function legacyFileEntityId(path: string): string {
  return `file:${path}`;
}

/** @deprecated Path-derived id — legacy graphs only. */
export function legacyDirEntityId(path: string): string {
  return `dir:${path}`;
}

/**
 * 122 random bits (a full v4 UUID, dashes removed). A collision would merge two
 * files into one entity, the very bug minting exists to prevent, so the id
 * must stay unique across every file ever added in a synced graph.
 *
 * Web Crypto global, not `node:crypto`: same v4 UUID on Node ≥20 (engines), Bun and
 * browsers, so browser bundles that reach `decompose` (tml-runtime, admin-shell) build.
 */
function mintSuffix(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, '');
}

export function mintFileEntityId(): string {
  return `${MINTED_FILE_PREFIX}${mintSuffix()}`;
}

export function mintDirEntityId(): string {
  return `${MINTED_DIR_PREFIX}${mintSuffix()}`;
}

export function isMintedFileEntityId(id: string): boolean {
  return id.startsWith(MINTED_FILE_PREFIX);
}

export function isMintedDirEntityId(id: string): boolean {
  return id.startsWith(MINTED_DIR_PREFIX);
}

export function normalizeDirPath(dir: string): string {
  return dir === '.' ? '' : dir;
}

function dirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i <= 0 ? '.' : p.slice(0, i);
}

function entityHasType(
  store: EAVStore,
  entityId: string,
  type: 'FileNode' | 'DirectoryNode',
): boolean {
  return store
    .getFactsByEntity(entityId)
    .some((f) => f.a === 'type' && f.v === type);
}

export function resolveFileEntityIdByPath(
  store: EAVStore,
  filePath: string,
): string | null {
  const matches = store.getFactsByValue('path', filePath);
  for (const fact of matches) {
    if (entityHasType(store, fact.e, 'FileNode')) {
      return fact.e;
    }
  }
  return null;
}

export function resolveDirEntityIdByPath(
  store: EAVStore,
  dirPath: string,
): string | null {
  const normalized = normalizeDirPath(dirPath);
  const matches = store.getFactsByValue('path', normalized);
  for (const fact of matches) {
    if (entityHasType(store, fact.e, 'DirectoryNode')) {
      return fact.e;
    }
  }
  return null;
}

/**
 * Resolve a repo path to a FileNode id, falling back to legacy `file:<path>`
 * when no indexed entity exists (pre-TRL-456 graphs).
 */
export function resolveFileEntityIdForPath(
  store: EAVStore | null | undefined,
  filePath: string,
): string {
  if (store) {
    const resolved = resolveFileEntityIdByPath(store, filePath);
    if (resolved) return resolved;
  }
  return legacyFileEntityId(filePath);
}

export function fileEntityIdFromPayload(
  vcs: NonNullable<VcsOp['vcs']>,
  path?: string,
): string {
  if (vcs.fileEntityId) return vcs.fileEntityId;
  if (path) return legacyFileEntityId(path);
  if (vcs.filePath) return legacyFileEntityId(vcs.filePath);
  if (vcs.oldFilePath) return legacyFileEntityId(vcs.oldFilePath);
  throw new Error('file op missing fileEntityId and file path');
}

export function dirEntityIdFromPayload(
  vcs: NonNullable<VcsOp['vcs']>,
  dirPath: string,
  role: 'dirEntityId' | 'oldDirEntityId' | 'newDirEntityId' = 'dirEntityId',
): string {
  const fromPayload = vcs[role];
  if (fromPayload) return fromPayload;
  return legacyDirEntityId(normalizeDirPath(dirPath));
}

/**
 * Stamp minted / resolved entity ids onto file ops before decomposition.
 * Idempotent when ids are already present (replay).
 */
export function enrichFileOp(store: EAVStore, op: VcsOp): VcsOp {
  const vcs = op.vcs;
  if (!vcs) return op;

  const next = { ...vcs };
  let changed = false;

  switch (op.kind) {
    case 'vcs:fileAdd': {
      if (!vcs.filePath) break;
      if (!next.fileEntityId) {
        next.fileEntityId = mintFileEntityId();
        changed = true;
      }
      const dir = normalizeDirPath(dirname(vcs.filePath));
      if (!next.dirEntityId) {
        next.dirEntityId =
          resolveDirEntityIdByPath(store, dir) ?? mintDirEntityId();
        changed = true;
      }
      break;
    }
    case 'vcs:fileModify':
    case 'vcs:fileDelete': {
      if (!vcs.filePath) break;
      if (!next.fileEntityId) {
        next.fileEntityId =
          resolveFileEntityIdByPath(store, vcs.filePath) ??
          legacyFileEntityId(vcs.filePath);
        changed = true;
      }
      if (op.kind === 'vcs:fileDelete') {
        const dir = normalizeDirPath(dirname(vcs.filePath));
        if (!next.dirEntityId) {
          next.dirEntityId =
            resolveDirEntityIdByPath(store, dir) ??
            legacyDirEntityId(dir);
          changed = true;
        }
      }
      break;
    }
    case 'vcs:fileRename': {
      if (!vcs.filePath || !vcs.oldFilePath) break;
      if (!next.fileEntityId) {
        next.fileEntityId =
          resolveFileEntityIdByPath(store, vcs.oldFilePath) ??
          legacyFileEntityId(vcs.oldFilePath);
        changed = true;
      }
      const oldDir = normalizeDirPath(dirname(vcs.oldFilePath));
      const newDir = normalizeDirPath(dirname(vcs.filePath));
      if (!next.oldDirEntityId) {
        next.oldDirEntityId =
          resolveDirEntityIdByPath(store, oldDir) ??
          legacyDirEntityId(oldDir);
        changed = true;
      }
      if (!next.newDirEntityId) {
        next.newDirEntityId =
          resolveDirEntityIdByPath(store, newDir) ?? mintDirEntityId();
        changed = true;
      }
      break;
    }
    default:
      break;
  }

  if (!changed) return op;
  return { ...op, vcs: next };
}
