export interface RegistryVersion {
  content: string;
  revision: string;
  schemas: string[];
}

export interface RegistryIndex {
  name: string;
  latest: string;
  versions: Record<string, RegistryVersion>;
}

export interface PackageManifest {
  name: string;
  version: string;
  content: string;
  schemas: Array<{
    '@id': string;
    '@type': string;
    version: string;
    depends?: Record<string, string>;
  }>;
  depends?: Record<string, string>;
}

const REGISTRY_BASE = 'https://registry.trellis.computer';

export class RegistryClient {
  private cache = new Map<string, { data: RegistryIndex; fetched: number }>();
  private readonly cacheTTL = 60_000;

  constructor(private baseUrl: string = REGISTRY_BASE) {}

  async fetchIndex(scope: string): Promise<RegistryIndex> {
    const cached = this.cache.get(scope);
    if (cached && Date.now() - cached.fetched < this.cacheTTL) {
      return cached.data;
    }

    const url = `${this.baseUrl}/@trellis.computer/${scope}`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error(`Cannot reach registry at ${url}`);
    }

    if (!response.ok) {
      throw new Error(`Registry returned ${response.status} for ${scope}`);
    }

    const data = (await response.json()) as RegistryIndex;
    this.cache.set(scope, { data, fetched: Date.now() });
    return data;
  }

  async fetchPackage(scope: string, name: string, version: string): Promise<PackageManifest> {
    const index = await this.fetchIndex(scope);
    const versionMeta = index.versions[version];
    if (!versionMeta) {
      throw new Error(`Package ${name}@${version} not found in registry`);
    }

    const url = `${this.baseUrl}/@trellis.computer/${scope}/${name}/${version}/package.json`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error(`Cannot fetch package metadata at ${url}`);
    }

    if (!response.ok) {
      throw new Error(`Registry returned ${response.status} for ${name}@${version}`);
    }

    return (await response.json()) as PackageManifest;
  }

  async listVersions(scope: string): Promise<RegistryIndex> {
    return this.fetchIndex(scope);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
