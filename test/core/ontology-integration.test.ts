import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { createKernelBackend } from '../../src/core/persist/factory.js';
import type { KernelBackend } from '../../src/core/persist/backend.js';
import {
  CORE_ONTOLOGY,
  CORE_VERSION,
  integrationEntityId,
  KNOWN_INTEGRATION_PROVIDERS,
} from '../../src/core/ontology/core-ontology.js';
import type { SchemaDefinition } from '../../src/core/ontology/types.js';

// TRL-195 — Integration promoted to a platform (core-tier) type (ADR-0036 §3 P0).

const index = new Map<string, SchemaDefinition>();
for (const s of CORE_ONTOLOGY) index.set(s['@id'], s);

describe('core:Integration schema (FIN-0051 shape)', () => {
  it('is a core-tier schema inheriting core:Thing', () => {
    const int = index.get('core:Integration');
    expect(int).toBeDefined();
    expect(int!.tier).toBe('core');
    expect(int!.subClassOf).toBe('core:Thing');
  });

  it('carries the FIN-0051 field shape', () => {
    const fields = Object.fromEntries(index.get('core:Integration')!.fields.map((f) => [f.name, f]));
    expect(fields.provider).toBeDefined();
    expect(fields.status.valueType).toBe('select');
    expect(fields.status.selectOptions).toEqual(['connected', 'error', 'disconnected']);
    for (const name of ['label', 'externalId', 'linkedAt', 'lastSyncedAt', 'credentialRef', 'environment', 'errorMessage']) {
      expect(fields[name], `missing field ${name}`).toBeDefined();
    }
  });

  it('keeps provider open — rich_text, not a closed select', () => {
    const provider = index.get('core:Integration')!.fields.find((f) => f.name === 'provider')!;
    expect(provider.valueType).toBe('rich_text');
    expect(provider.selectOptions ?? []).toHaveLength(0);
  });

  it('includes github among known providers', () => {
    expect(KNOWN_INTEGRATION_PROVIDERS).toContain('github');
    // The extra type shares the core VERSION (lockstep invariant).
    const int = index.get('core:Integration')!;
    expect(int.version).toBe(CORE_VERSION);
  });
});

describe('integrationEntityId', () => {
  it('builds a stable provider:externalId id', () => {
    expect(integrationEntityId('github', 'octocat/hello-world')).toBe('integration:github:octocat/hello-world');
    expect(integrationEntityId('plaid', 'item_123')).toBe('integration:plaid:item_123');
  });

  it('is idempotent', () => {
    expect(integrationEntityId('calcom', 'default')).toBe(integrationEntityId('calcom', 'default'));
  });
});

describe('Integration entities + syncedVia (kernel round-trip)', () => {
  let tmpDir: string;
  let backend: KernelBackend;
  let kernel: TrellisKernel;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), `trellis-integration--${process.pid}-${Date.now().toString(36)}`));
    backend = await createKernelBackend(join(tmpDir, 'test.db'));
    kernel = new TrellisKernel({ backend, agentId: 'test-agent' });
    kernel.boot();
  });

  afterEach(() => {
    backend.close?.();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('upserts an Integration on its stable id and reads it back', async () => {
    const id = integrationEntityId('github', 'octocat/hello-world');
    await kernel.createEntity(id, 'Integration', {
      provider: 'github',
      status: 'connected',
      label: 'octocat/hello-world',
      credentialRef: 'github:token:octocat',
    });
    const rec = kernel.getEntity(id)!;
    expect(rec.type).toBe('Integration');
    expect(rec.facts.find((f) => f.a === 'provider')?.v).toBe('github');
    // credentialRef is an opaque pointer, never a token value.
    expect(rec.facts.find((f) => f.a === 'credentialRef')?.v).not.toMatch(/^ghp_|^github_pat_/);
  });

  it('writes and reads a syncedVia link from an Issue entity', async () => {
    const intId = integrationEntityId('github', 'octocat/hello-world');
    await kernel.createEntity(intId, 'Integration', { provider: 'github', status: 'connected', label: 'repo' });
    await kernel.createEntity('issue:TRL-9', 'Issue', { title: 'imported issue', status: 'backlog' });
    await kernel.addLink('issue:TRL-9', 'syncedVia', intId);

    const links = kernel.getEntity('issue:TRL-9')!.links ?? [];
    const synced = links.find((l) => l.a === 'syncedVia');
    expect(synced?.e2).toBe(intId);
  });

  it('accepts an arbitrary provider string without a schema change', async () => {
    const id = integrationEntityId('gitlab', 'group/project');
    await kernel.createEntity(id, 'Integration', { provider: 'gitlab', status: 'connected', label: 'group/project' });
    expect(kernel.getEntity(id)!.facts.find((f) => f.a === 'provider')?.v).toBe('gitlab');
  });
});
