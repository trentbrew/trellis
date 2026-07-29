import type { LockfileData } from './lockfile.js';
import { computeContentHash } from './lockfile.js';
import type { RegistryClient } from './client.js';

export interface ResolveResult {
  success: true;
  packages: Array<{
    name: string;
    version: string;
    content: string;
    revision: string;
    schemas: Array<{ '@id': string; version: string; content: string }>;
  }>;
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

function satisfies(version: string, range: string): boolean {
  if (range === '*' || range === 'latest') return true;
  if (range.startsWith('>=')) {
    const min = range.slice(2);
    return compareVersions(version, min) >= 0;
  }
  if (range.startsWith('>')) {
    const min = range.slice(1);
    return compareVersions(version, min) > 0;
  }
  if (range.startsWith('<=')) {
    const max = range.slice(2);
    return compareVersions(version, max) <= 0;
  }
  if (range.startsWith('<')) {
    const max = range.slice(1);
    return compareVersions(version, max) < 0;
  }
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
  if (range.includes(' ')) {
    const parts = range.split(/\s+/);
    return parts.every((p) => satisfies(version, p));
  }
  if (range.includes('||')) {
    const parts = range.split(/\s*\|\|\s*/);
    return parts.some((p) => satisfies(version, p));
  }
  if (range.includes(' - ')) {
    const [low, high] = range.split(' - ');
    return compareVersions(version, low) >= 0 && compareVersions(version, high) <= 0;
  }
  return version === range;
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
  const resolved = new Map<string, { version: string; content: string; revision: string; schemas: Array<{ '@id': string; version: string; content: string }> }>();
  const conflicts: ResolveConflict[] = [];

  try {
    const index = await client.fetchIndex(type);
    const constraintStr = constraint || `>=${index.latest}`;
    const latest = latestSatisfying(Object.keys(index.versions), constraintStr);

    if (!latest) {
      return {
        success: false,
        conflicts: [{
          type: 'not_found',
          message: `No version of ${name} in @trellis.computer/${type} satisfies ${constraintStr}`,
        }],
      };
    }

    const pkg = await client.fetchPackage(type, name, latest);
    const schemas = pkg.schemas.map((s) => ({
      '@id': s['@id'],
      version: s.version,
      content: computeContentHash(JSON.stringify(s)),
    }));

    resolved.set(pkg.name, {
      version: pkg.version,
      content: pkg.content,
      revision: `refs/tags/v${pkg.version}`,
      schemas,
    });

    if (pkg.depends) {
      for (const [depName, depRange] of Object.entries(pkg.depends)) {
        const depType = depName.includes(':') ? 'ontologies' : type;
        const depIndex = await client.fetchIndex(depType);
        const depLatest = latestSatisfying(Object.keys(depIndex.versions), depRange);
        if (!depLatest) {
          conflicts.push({
            type: 'missing_dependency',
            message: `Cannot resolve ${depName}@${depRange} required by ${pkg.name}`,
            packageA: pkg.name,
            schema: depName,
          });
          continue;
        }
        const depPkg = await client.fetchPackage(depType, depName, depLatest);
        const depSchemas = depPkg.schemas.map((s) => ({
          '@id': s['@id'],
          version: s.version,
          content: computeContentHash(JSON.stringify(s)),
        }));
        if (!resolved.has(depPkg.name)) {
          resolved.set(depPkg.name, {
            version: depPkg.version,
            content: depPkg.content,
            revision: `refs/tags/v${depPkg.version}`,
            schemas: depSchemas,
          });
        }
      }
    }
  } catch (err: any) {
    return {
      success: false,
      conflicts: [{
        type: 'not_found',
        message: err.message || `Failed to resolve ${name} from @trellis.computer/${type}`,
      }],
    };
  }

  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }

  const packages = Array.from(resolved.entries()).map(([name, pkg]) => ({
    name,
    version: pkg.version,
    content: pkg.content,
    revision: pkg.revision,
    schemas: pkg.schemas,
  }));

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
