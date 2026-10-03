import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { createKernelBackend } from '../../src/core/persist/factory.js';
import type { KernelBackend } from '../../src/core/persist/backend.js';
import { CORE_ONTOLOGY } from '../../src/core/ontology/core-ontology.js';
import { builtinOntologies } from '../../src/core/ontology/builtins.js';
import type { SchemaDefinition } from '../../src/core/ontology/types.js';

// TRL-203 — Repo + thin Project core types; retire the code-shaped trellis:project.

const index = new Map<string, SchemaDefinition>();
for (const s of CORE_ONTOLOGY) index.set(s['@id'], s);

describe('core:Project (thin work container)', () => {
  it('is a core-tier type with only name/description/status', () => {
    const p = index.get('core:Project')!;
    expect(p).toBeDefined();
    expect(p.tier).toBe('core');
    const names = p.fields.map((f) => f.name).sort();
    expect(names).toEqual(['description', 'name', 'status']);
    expect(p.fields.find((f) => f.name === 'name')!.required).toBe(true);
  });

  it('has no owned subtypes or god-link field', () => {
    const p = index.get('core:Project')!;
    expect(p.fields.some((f) => f.name === 'related')).toBe(false);
    expect(p.fields.some((f) => f.name === 'modules' || f.name === 'features')).toBe(false);
  });
});

describe('core:Repo (thin repo identity)', () => {
  it('is a core-tier type with the documented fields', () => {
    const r = index.get('core:Repo')!;
    expect(r).toBeDefined();
    expect(r.tier).toBe('core');
    const byName = Object.fromEntries(r.fields.map((f) => [f.name, f]));
    expect(byName.path).toBeDefined();
    expect(byName.remote).toBeDefined();
    expect(byName.defaultBranch).toBeDefined();
    expect(byName.trellisRoot).toBeDefined();
    expect(byName.vcs.valueType).toBe('select');
    expect(byName.vcs.selectOptions).toEqual(['git', 'trellis', 'none']);
  });

  it('relates to Integration and Project', () => {
    const r = index.get('core:Repo')!;
    const byName = Object.fromEntries(r.fields.map((f) => [f.name, f]));
    expect(byName.integration.relation?.targetSchema).toBe('core:Integration');
    expect(byName.represents.relation?.targetSchema).toBe('core:Project');
    expect(byName.serves.relation?.targetSchema).toBe('core:Service');
    expect(byName.serves.relation?.cardinality).toBe('many');
  });
});

describe('core:Service (a runnable thing a repo serves)', () => {
  it('is a core-tier type with the documented fields', () => {
    const s = index.get('core:Service')!;
    expect(s).toBeDefined();
    expect(s.tier).toBe('core');
    const byName = Object.fromEntries(s.fields.map((f) => [f.name, f]));
    for (const n of ['name', 'kind', 'port', 'ports', 'command', 'status', 'url']) {
      expect(byName[n], `missing field ${n}`).toBeDefined();
    }
    expect(byName.kind.selectOptions).toEqual(['dev-server', 'publish', 'docs', 'worker', 'other']);
    expect(byName.status.selectOptions).toEqual(['running', 'stopped', 'error', 'unknown']);
    expect(byName.ports.valueType).toBe('json');
  });
});

describe('retired code-shaped project ontology', () => {
  it('is no longer a builtin', () => {
    const ids = builtinOntologies.map((o) => o.id);
    expect(ids).not.toContain('trellis:project');
    expect(builtinOntologies).toHaveLength(2);
  });

  it('has no dangling team-relation targets', () => {
    const team = builtinOntologies.find((o) => o.id === 'trellis:team')!;
    for (const rel of team.relations ?? []) {
      for (const t of rel.targetTypes) {
        // Any target must be a known core type, not a retired one.
        expect(['Project', 'Module', 'Feature', 'Dependency', 'Config', 'Artifact', 'Release']).not.toContain(t);
      }
    }
  });
});

describe('Project + Repo kernel round-trip', () => {
  let tmpDir: string;
  let backend: KernelBackend;
  let kernel: TrellisKernel;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), `trellis-repo-proj--${process.pid}-${Date.now().toString(36)}`));
    backend = await createKernelBackend(join(tmpDir, 'test.db'));
    kernel = new TrellisKernel({ backend, agentId: 'test-agent' });
    kernel.boot();
  });

  afterEach(() => {
    backend.close?.();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a thin Project and reads it back', async () => {
    await kernel.createEntity('project:album', 'Project', { name: 'Album', status: 'active' });
    const rec = kernel.getEntity('project:album')!;
    expect(rec.type).toBe('Project');
    expect(rec.facts.find((f) => f.a === 'name')?.v).toBe('Album');
    expect(rec.facts.find((f) => f.a === 'status')?.v).toBe('active');
  });

  it('creates a Repo linked to an Integration and Project', async () => {
    await kernel.createEntity('project:album', 'Project', { name: 'Album' });
    await kernel.createEntity('integration:git-bug:r', 'Integration', {
      provider: 'git-bug', status: 'connected', label: 'r',
    });
    await kernel.createEntity('repo:local:x', 'Repo', {
      name: 'x', path: '/tmp/x', vcs: 'git', defaultBranch: 'main',
    });
    await kernel.addLink('repo:local:x', 'integration', 'integration:git-bug:r');
    await kernel.addLink('repo:local:x', 'represents', 'project:album');

    const links = kernel.getEntity('repo:local:x')!.links ?? [];
    expect(links.find((l) => l.a === 'integration')?.e2).toBe('integration:git-bug:r');
    expect(links.find((l) => l.a === 'represents')?.e2).toBe('project:album');
  });

  it('a repo serves multiple services, queryable by port', async () => {
    await kernel.createEntity('repo:local:web', 'Repo', { name: 'web', vcs: 'git' });
    await kernel.createEntity('service:web-dev', 'Service', {
      name: 'web dev server', kind: 'dev-server', port: 5173, status: 'running',
    });
    await kernel.createEntity('service:web-publish', 'Service', {
      name: 'npm publish', kind: 'publish', status: 'unknown',
    });
    await kernel.addLink('repo:local:web', 'serves', 'service:web-dev');
    await kernel.addLink('repo:local:web', 'serves', 'service:web-publish');

    const serves = (kernel.getEntity('repo:local:web')!.links ?? []).filter((l) => l.a === 'serves');
    expect(serves).toHaveLength(2);

    // Queryable by port across the graph.
    const services = kernel.listEntities('Service');
    const on5173 = services.filter((e) => e.facts.some((f) => f.a === 'port' && f.v === 5173));
    expect(on5173).toHaveLength(1);
    expect(on5173[0].facts.find((f) => f.a === 'kind')?.v).toBe('dev-server');
  });
});
