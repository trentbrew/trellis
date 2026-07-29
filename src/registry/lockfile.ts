import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

export interface LockedSchema {
  '@id': string;
  version: string;
  content: string;
}

export interface LockedPackage {
  version: string;
  content: string;
  revision: string;
  schemas: Record<string, LockedSchema>;
}

export interface LockfileData {
  version: number;
  lockfileVersion: string;
  resolved: Record<string, LockedPackage>;
  root: {
    depends: Record<string, string>;
  };
}

const CURRENT_VERSION = 1;
const LOCKFILE_VERSION = '1.0.0';

export const LOCKFILE_PATH = '.trellis/deps.json';

export function computeContentHash(body: string): string {
  const canonical = JSON.stringify(JSON.parse(body), Object.keys(JSON.parse(body)).sort());
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function readLockfile(rootPath: string): LockfileData | null {
  const filePath = join(rootPath, LOCKFILE_PATH);
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as LockfileData;
  validateLockfile(data);
  return data;
}

export function writeLockfile(rootPath: string, data: LockfileData): void {
  const filePath = join(rootPath, LOCKFILE_PATH);
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

export function validateLockfile(data: unknown): asserts data is LockfileData {
  if (typeof data !== 'object' || data === null) throw new Error('Invalid lockfile: not an object');
  const d = data as Record<string, unknown>;
  if (d.version !== CURRENT_VERSION) throw new Error(`Invalid lockfile version: ${d.version}`);
  if (d.lockfileVersion !== LOCKFILE_VERSION) throw new Error(`Invalid lockfile version: ${d.lockfileVersion}`);
  if (typeof d.resolved !== 'object' || d.resolved === null) throw new Error('Invalid lockfile: resolved is not an object');
  if (typeof d.root !== 'object' || d.root === null) throw new Error('Invalid lockfile: root is not an object');
}

export function createLockfile(): LockfileData {
  return {
    version: CURRENT_VERSION,
    lockfileVersion: LOCKFILE_VERSION,
    resolved: {},
    root: { depends: {} },
  };
}

export function addToLockfile(
  lockfile: LockfileData,
  pkg: {
    name: string;
    version: string;
    content: string;
    revision: string;
    schemas: Array<{ '@id': string; version: string; content: string }>;
  },
): void {
  const schemas: Record<string, LockedSchema> = {};
  for (const s of pkg.schemas) {
    schemas[s['@id']] = { '@id': s['@id'], version: s.version, content: s.content };
  }
  lockfile.resolved[pkg.name] = {
    version: pkg.version,
    content: pkg.content,
    revision: pkg.revision,
    schemas,
  };
}

export function removeFromLockfile(lockfile: LockfileData, name: string): boolean {
  if (!lockfile.resolved[name]) return false;
  delete lockfile.resolved[name];
  return true;
}

export function findDependents(lockfile: LockfileData, name: string): string[] {
  const dependents: string[] = [];
  const shortName = name.includes('/') ? name.split('/').pop()! : name;
  for (const [pkgName, pkg] of Object.entries(lockfile.resolved)) {
    if (pkgName === name) continue;
    for (const schema of Object.values(pkg.schemas)) {
      if (schema['@id'].includes(shortName) || schema['@id'].includes(name)) {
        dependents.push(pkgName);
        break;
      }
    }
  }
  return dependents;
}
