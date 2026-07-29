import type { LockfileData } from './lockfile.js';
import { computeContentHash } from './lockfile.js';
import type { RegistryClient, PackageManifest, RegistryIndex } from './client.js';

export interface ResolvedPackage {
  name: string;
  version: string;
  content: string;
  revision: string;
  schemas: Array<{ '@id': string; version: string; content: string }>;
}

export interface ResolveResult {
  success: true;
  packages: ResolvedPackage[];
  lockfile: LockfileData;
}

export interface ResolveConflict {
  type: 'version_mismatch' | 'missing_dependency' | 'not_found';
  message: string;
  packageA?: string;
  packageB?: string;
  schema?: string;
}

export interface ResolveError {
  success: false;
  conflicts: ResolveConflict[];
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function satisfies(version: string, range: string): boolean {
  if (range === '*' || range === 'latest') return true;
  if (range.startsWith('>=')) return compareVersions(version, range.slice(2)) >= 0;
  if (range.startsWith('>')) return compareVersions(version, range.slice(1)) > 0;
  if (range.startsWith('<=')) return compareVersions(version, range.slice(2)) <= 0;
  if (range.startsWith('<')) return compareVersions(version, range.slice(1)) < 0;
  if (range.startsWith('^')) {
    const min = range.slice(1);
    const parts = min.split('.');
    const major = parseInt(parts[0], 10);
    if (parts.length >= 2) {
      const nextMajor = `${major + 1}.0.0`;
      return compareVersions(version, min) >= 0 && compareVersions(version, nextMajor) < 0;
    }
    return version.startsWith(`${major}.`) || version === min;
  }
  if (range.startsWith('~')) {
    const min = range.slice(1);
    const parts = min.split('.');
    if (parts.length >= 2) {
      const nextMinor = `${parts[0]}.${parseInt(parts[1], 10) + 1}.0`;
      return compareVersions(version, min) >= 0 && compareVersions(version, nextMinor) < 0;
    }
    return version === min;
  }
  return version === range;
}

function latestSatisfying(versions: string[], range: string): string | null {
  const matching = versions.filter((v) => satisfies(v, range));
  if (matching.length === 0) return null;
  matching.sort((a, b) => compareVersions(b, a));
  return matching[0];
}

export async function resolvePackage(
  client: RegistryClient,
  lockfile: LockfileData | null,
  type: string,
  name: string,
  constraint?: string,
): Promise<ResolveResult | ResolveError> {
  const resolved = new Map<string, ResolvedPackage>();
  const conflicts: ResolveConflict[] = [];
  const queue: Array<{ type: string; name: string; constraint: string; parent?: string }> = [];
  const index = await client.fetchIndex();

  queue.push({ type, name, constraint: constraint || 'latest' });

  while (queue.length > 0) {
    const item = queue.shift()!;
    const pkgKey = `${item.type}/${item.name}`;
    if (resolved.has(pkgKey)) continue;

    const pkgIndex = index.packages[item.type]?.[item.name];
    if (!pkgIndex) {
      conflicts.push({
        type: 'not_found',
        message: `${item.type}/${item.name} not found in registry`,
        packageA: item.parent,
        schema: pkgKey,
      });
      continue;
    }

    const version = latestSatisfying(Object.keys(pkgIndex.versions), item.constraint);
    if (!version) {
      conflicts.push({
        type: 'not_found',
        message: `No version of ${item.type}/${item.name} satisfies ${item.constraint}`,
        packageA: item.parent,
        schema: pkgKey,
      });
      continue;
    }

    let manifest: PackageManifest;
    try {
      manifest = await client.fetchPackage(item.type, item.name, version);
    } catch (err: any) {
      conflicts.push({
        type: 'not_found',
        message: err.message || `Failed to fetch ${item.type}/${item.name}@${version}`,
      });
      continue;
    }

    const schemas = manifest.schemas.map((s) => ({
      '@id': s['@id'],
      version: s.version,
      content: computeContentHash(JSON.stringify(s)),
    }));

    resolved.set(pkgKey, {
      name: manifest.name,
      version: manifest.version,
      content: manifest.content,
      revision: `refs/tags/v${manifest.version}`,
      schemas,
    });

    if (manifest.depends) {
      for (const [depRef, depRange] of Object.entries(manifest.depends)) {
        if (depRef.includes(':')) continue;
        let depType = type;
        let depName = depRef;
        if (depRef.startsWith('@trellis.computer/')) {
          const parts = depRef.replace('@trellis.computer/', '').split('/');
          depType = parts[0];
          depName = parts.slice(1).join('/');
        } else if (depRef.includes('/')) {
          const parts = depRef.split('/');
          depType = parts[0];
          depName = parts.slice(1).join('/');
        }
        queue.push({ type: depType, name: depName, constraint: depRange, parent: pkgKey });
      }
    }
  }

  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }

  const packages = Array.from(resolved.values());

  const newLockfile: LockfileData = lockfile || {
    version: 1,
    lockfileVersion: '1.0.0',
    resolved: {},
    root: { depends: {} },
  };

  for (const pkg of packages) {
    const schemas: Record<string, { '@id': string; version: string; content: string }> = {};
    for (const s of pkg.schemas) {
      schemas[s['@id']] = s;
    }
    newLockfile.resolved[pkg.name] = {
      version: pkg.version,
      content: pkg.content,
      revision: pkg.revision,
      schemas,
    };
  }

  return { success: true, packages, lockfile: newLockfile };
}

export { satisfies, compareVersions, latestSatisfying };
