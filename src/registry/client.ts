export interface RegistrySchemaEntry {
  '@id': string;
  '@type': string;
  version: string;
  depends?: Record<string, string>;
}

export interface PackageManifest {
  name: string;
  version: string;
  content: string;
  schemas: RegistrySchemaEntry[];
  depends?: Record<string, string>;
}

export interface PackageVersionEntry {
  content: string;
  revision: string;
  schemas: RegistrySchemaEntry[];
}

export interface PackageIndex {
  latest: string;
  versions: Record<string, PackageVersionEntry>;
}

export interface RegistryIndex {
  published: string;
  packages: Record<string, Record<string, PackageIndex>>;
}

const DEFAULT_REPO = 'trellis-computer/registry';
const DEFAULT_BRANCH = 'main';
const CACHE_TTL = 60_000;

export class RegistryClient {
  private indexCache: { data: RegistryIndex; fetched: number } | null = null;
  private pkgCache = new Map<string, { data: PackageManifest; fetched: number }>();
  private readonly baseUrl: string;

  constructor(
    opts?: { repo?: string; branch?: string; baseUrl?: string },
  ) {
    if (opts?.baseUrl) {
      this.baseUrl = opts.baseUrl;
    } else {
      const repo = opts?.repo ?? DEFAULT_REPO;
      const branch = opts?.branch ?? DEFAULT_BRANCH;
      this.baseUrl = `https://raw.githubusercontent.com/${repo}/${branch}`;
    }
  }

  private async fetchJson<T>(path: string, cacheKey?: string): Promise<T> {
    const url = `${this.baseUrl}/${path}`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error(`Cannot reach registry at ${url}`);
    }
    if (!response.ok) {
      throw new Error(`Registry returned ${response.status} for ${path}`);
    }
    return (await response.json()) as T;
  }

  async fetchIndex(): Promise<RegistryIndex> {
    if (this.indexCache && Date.now() - this.indexCache.fetched < CACHE_TTL) {
      return this.indexCache.data;
    }
    const data = await this.fetchJson<RegistryIndex>('INDEX.json');
    this.indexCache = { data, fetched: Date.now() };
    return data;
  }

  async fetchPackage(type: string, name: string, version: string): Promise<PackageManifest> {
    const key = `${type}/${name}@${version}`;
    const cached = this.pkgCache.get(key);
    if (cached && Date.now() - cached.fetched < CACHE_TTL) {
      return cached.data;
    }
    const data = await this.fetchJson<PackageManifest>(`${type}/${name}/${version}.json`);
    this.pkgCache.set(key, { data, fetched: Date.now() });
    return data;
  }

  async resolve(type: string, name: string, constraint: string): Promise<{ version: string; manifest: PackageManifest } | null> {
    const index = await this.fetchIndex();
    const typeIndex = index.packages[type];
    if (!typeIndex) return null;
    const pkgIndex = typeIndex[name];
    if (!pkgIndex) return null;

    const version = latestSatisfying(Object.keys(pkgIndex.versions), constraint);
    if (!version) return null;

    const manifest = await this.fetchPackage(type, name, version);
    return { version, manifest };
  }

  clearCache(): void {
    this.indexCache = null;
    this.pkgCache.clear();
  }
}

// Re-export the resolver helpers for use by publish
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
