import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { computeContentHash } from './lockfile.js';
import { compareVersions } from './version-utils.js';
import type { RegistryIndex, PackageManifest, RegistrySchemaEntry } from './client.js';

export interface PackageBody {
  name: string;
  version: string;
  content: string;
  schemas: RegistrySchemaEntry[];
  depends?: Record<string, string>;
  agent?: {
    model?: string;
    provider?: string;
    systemPrompt?: string;
    tools?: string[];
    capabilities?: string[];
    temperature?: number;
    maxTokens?: number;
  };
}

export function scaffoldPackage(type: string, name: string, dir: string): string {
  const pkgDir = join(dir, type, name);
  if (existsSync(pkgDir)) throw new Error(`Package ${type}/${name} already exists at ${pkgDir}`);

  mkdirSync(pkgDir, { recursive: true });

  const body: PackageBody = {
    name: `@trellis.computer/${type}/${name}`,
    version: '0.1.0',
    content: '',
    schemas: [
      type === 'agent'
        ? { '@id': `agent:${name}`, '@type': 'core:Agent', version: '0.1.0' }
        : { '@id': `trellis:${name}`, '@type': 'trellis:Schema', version: '0.1.0' },
    ],
  };

  if (type === 'agent') {
    body.agent = {
      model: '',
      provider: '',
      systemPrompt: '',
      tools: [],
      capabilities: [],
      temperature: undefined,
      maxTokens: undefined,
    };
  }

  const hashBody = { ...body, content: '' };
  const canonical = JSON.stringify(hashBody, Object.keys(hashBody).sort(), 2);
  body.content = computeContentHash(canonical);

  const filePath = join(pkgDir, `${body.version}.json`);
  writeFileSync(filePath, JSON.stringify(body, null, 2) + '\n');

  return filePath;
}

export function validatePackage(filePath: string): { valid: boolean; errors: string[]; body: PackageBody | null } {
  const errors: string[] = [];

  if (!existsSync(filePath)) {
    return { valid: false, errors: [`File not found: ${filePath}`], body: null };
  }

  let body: PackageBody;
  try {
    body = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return { valid: false, errors: ['Invalid JSON'], body: null };
  }

  if (!body.name) errors.push('Missing "name"');
  if (!body.version) errors.push('Missing "version"');
  if (!body.schemas || !Array.isArray(body.schemas)) errors.push('Missing or invalid "schemas" array');

  if (body.schemas) {
    for (const s of body.schemas) {
      if (!s['@id']) errors.push('Schema missing "@id"');
      if (!s['@type']) errors.push('Schema missing "@type"');
      if (!s.version) errors.push(`Schema ${s['@id'] || '(unnamed)'} missing "version"`);
    }
  }

  const hashBody = { ...body, content: '' };
  const canonical = JSON.stringify(hashBody, Object.keys(hashBody).sort(), 2);
  const actualHash = computeContentHash(canonical);
  if (body.content && body.content !== actualHash) {
    errors.push(`Content hash mismatch: expected ${actualHash}, got ${body.content}`);
  }

  return { valid: errors.length === 0, errors, body };
}

export function updatePackageVersion(filePath: string, newVersion: string): PackageBody {
  const body = JSON.parse(readFileSync(filePath, 'utf-8')) as PackageBody;
  body.version = newVersion;

  for (const s of body.schemas) {
    s.version = newVersion;
  }

  const hashBody = { ...body, content: '' };
  const canonical = JSON.stringify(hashBody, Object.keys(hashBody).sort(), 2);
  body.content = computeContentHash(canonical);

  writeFileSync(filePath, JSON.stringify(body, null, 2) + '\n');
  return body;
}

export function generateIndex(registryDir: string): RegistryIndex {
  const packages: RegistryIndex['packages'] = {};

  const types = readdirSync(registryDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const typeDir of types) {
    const type = typeDir.name;
    if (type === '.git' || type.startsWith('.')) continue;

    const typePath = join(registryDir, type);
    const packageDirs = readdirSync(typePath, { withFileTypes: true }).filter((d) => d.isDirectory());

    for (const pkgDir of packageDirs) {
      const name = pkgDir.name;
      const pkgPath = join(typePath, name);
      const versionFiles = readdirSync(pkgPath).filter((f) => f.endsWith('.json'));

      const versions: Record<string, { content: string; revision: string; schemas: RegistrySchemaEntry[] }> = {};
      let latest = '0.0.0';

      for (const vf of versionFiles) {
        const filePath = join(pkgPath, vf);
        const body = JSON.parse(readFileSync(filePath, 'utf-8')) as PackageManifest;
        const version = body.version || vf.replace('.json', '');
        versions[version] = {
          content: body.content,
          revision: `refs/tags/v${version}`,
          schemas: body.schemas,
        };
        if (compareVersions(version, latest) > 0) latest = version;
      }

      if (Object.keys(versions).length === 0) continue;

      if (!packages[type]) packages[type] = {};
      packages[type][name] = { latest, versions };
    }
  }

  return {
    published: new Date().toISOString(),
    packages,
  };
}

export function writeIndex(registryDir: string): void {
  const index = generateIndex(registryDir);
  writeFileSync(join(registryDir, 'INDEX.json'), JSON.stringify(index, null, 2) + '\n');
}

export function publishPackage(registryDir: string, type: string, name: string, versionFile: string): void {
  const targetDir = join(registryDir, type, name);
  mkdirSync(targetDir, { recursive: true });

  const body = JSON.parse(readFileSync(versionFile, 'utf-8'));
  const fileName = `${body.version}.json`;
  writeFileSync(join(targetDir, fileName), JSON.stringify(body, null, 2) + '\n');

  writeIndex(registryDir);
}
