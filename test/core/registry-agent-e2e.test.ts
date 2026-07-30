import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { SqlJsKernelBackend } from '../../src/core/persist/sqljs-backend.js';
import { attachStandardMiddleware } from '../../src/core/kernel/boot-middleware.js';
import { scaffoldPackage, publishPackage } from '../../src/registry/publish.js';

describe('Registry Agent Package E2E', () => {
  let tmpDir: string;
  let registryDir: string;
  let kernel: TrellisKernel;

  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trellis-reg-e2e-'));
    registryDir = join(tmpDir, 'registry');

    const backend = await SqlJsKernelBackend.create({ dbPath: ':memory:' });
    backend.init();
    kernel = new TrellisKernel({ backend, agentId: 'test-agent' });
    kernel.boot();
    attachStandardMiddleware(kernel);
  });

  afterAll(() => {
    kernel.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('1: scaffolds an agent package', () => {
    const filePath = scaffoldPackage('agent', 'strategist', registryDir);
    expect(existsSync(filePath)).toBe(true);

    const body = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(body.name).toBe('@trellis.computer/agent/strategist');
    expect(body.agent).toBeDefined();
    expect(body.schemas[0]['@type']).toBe('core:Agent');
    expect(body.schemas[0]['@id']).toBe('agent:strategist');
  });

  it('2: publishes the package and generates index', () => {
    const versionFile = join(registryDir, 'agent', 'strategist', '0.1.0.json');
    const body = JSON.parse(readFileSync(versionFile, 'utf-8'));

    body.agent = {
      model: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      systemPrompt: 'You are a strategic planning agent.',
      capabilities: ['research', 'planning'],
      temperature: 0.3,
      maxTokens: 4096,
    };
    body.schemas = [{
      '@id': 'agent:strategist',
      '@type': 'core:Agent',
      version: '0.1.0',
    }];
    writeFileSync(versionFile, JSON.stringify(body, null, 2) + '\n');

    publishPackage(registryDir, 'agent', 'strategist', versionFile);

    const indexPath = join(registryDir, 'INDEX.json');
    expect(existsSync(indexPath)).toBe(true);
    const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
    expect(index.packages.agent.strategist.latest).toBe('0.1.0');
  });

  it('3: creates agent entity from package config', async () => {
    const agentId = 'agent:strategist';

    const attrs: Record<string, unknown> = {
      name: 'strategist',
      role: 'strategist',
      model: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      systemPrompt: 'You are a strategic planning agent.',
      capabilities: JSON.stringify(['research', 'planning']),
      temperature: 0.3,
      maxTokens: 4096,
      status: 'active',
    };

    await kernel.createEntity(agentId, 'core:Agent', attrs as any);

    const entity = kernel.getEntity(agentId);
    expect(entity).toBeDefined();
    expect(entity!.type).toBe('core:Agent');

    const facts = Object.fromEntries(
      entity!.facts.map((f: any) => [f.a, f.v]),
    );
    expect(facts.name).toBe('strategist');
    expect(facts.role).toBe('strategist');
    expect(facts.model).toBe('claude-sonnet-4-20250514');
    expect(facts.provider).toBe('anthropic');
    expect(facts.systemPrompt).toBe('You are a strategic planning agent.');
    expect(facts.temperature).toBe(0.3);
    expect(facts.maxTokens).toBe(4096);
    expect(facts.status).toBe('active');
  });

  it('4: agent schema has new fields and tools relation', () => {
    const agentSchema = kernel.getOntology('core:Agent');
    expect(agentSchema).toBeDefined();

    const fields = Object.fromEntries(
      agentSchema!.fields.map((f: any) => [f.name, f]),
    );

    expect(fields.provider).toBeDefined();
    expect(fields.provider.valueType).toBe('rich_text');

    expect(fields.systemPrompt).toBeDefined();
    expect(fields.systemPrompt.valueType).toBe('rich_text');

    expect(fields.temperature).toBeDefined();
    expect(fields.temperature.valueType).toBe('number');

    expect(fields.maxTokens).toBeDefined();
    expect(fields.maxTokens.valueType).toBe('number');

    expect(fields.tools).toBeDefined();
    expect(fields.tools.valueType).toBe('relation');
    expect(fields.tools.relation?.targetSchema).toBe('core:Tool');
    expect(fields.tools.relation?.cardinality).toBe('many');
  });

  it('5: update existing agent entity is idempotent', async () => {
    const agentId = 'agent:strategist';

    await kernel.updateEntity(agentId, { temperature: 0.5 } as any);

    const entity = kernel.getEntity(agentId);
    const facts = Object.fromEntries(
      entity!.facts.map((f: any) => [f.a, f.v]),
    );
    expect(facts.temperature).toBe(0.5);
    expect(facts.name).toBe('strategist');
  });
});
