/**
 * Tests for scaffold/write.ts — agent scaffold file writer
 */

import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeAgentScaffold } from '../../src/scaffold/write.js';
import type { ProjectContext } from '../../src/scaffold/infer.js';
import type { UserProfile } from '../../src/scaffold/profile.js';

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `trellis-write-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(testDir, '.trellis'), { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

const mockContext: ProjectContext = {
  domain: 'animation-studio',
  description: 'Agentic animation pipeline',
  ecosystem: 'bun',
  name: 'agent-studio',
  fileCount: 42,
  confidence: 'high',
  indicators: ['package.json', 'README.md'],
};

const mockProfile: UserProfile = {
  name: 'Trent',
  bio: 'Creative technologist building agentic media tools',
  skills: ['TypeScript', 'Motion Canvas', 'AI pipelines'],
  style: 'minimal, expressive, systems-first',
  preferences: { verbosity: 'concise', tone: 'peer' },
  createdAt: '2026-04-02T00:00:00.000Z',
  updatedAt: '2026-04-02T00:00:00.000Z',
};

test('creates AGENTS.md with profile and context', () => {
  writeAgentScaffold(testDir, { profile: mockProfile, context: mockContext });

  const agentsMd = readFileSync(join(testDir, '.trellis', 'agents', 'AGENTS.md'), 'utf-8');
  expect(agentsMd).toContain('Trent');
  expect(agentsMd).toContain('Creative technologist');
  expect(agentsMd).toContain('animation-studio');
  expect(agentsMd).toContain('bun');
  expect(agentsMd).toContain('agent-studio');
  expect(agentsMd).toContain('TypeScript, Motion Canvas, AI pipelines');
  expect(agentsMd).toContain('concise');
  expect(agentsMd).toContain('peer');
  expect(agentsMd).toContain('high');
});

test('creates agent-context.json (not config.json)', () => {
  writeAgentScaffold(testDir, { profile: mockProfile, context: mockContext });

  const configPath = join(testDir, '.trellis', 'agents', 'agent-context.json');
  expect(existsSync(configPath)).toBe(true);

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  expect(config.domain).toBe('animation-studio');
  expect(config.ecosystem).toBe('bun');
  expect(config.confidence).toBe('high');
  expect(config.tools).toEqual([]);
  expect(config.ontologies).toEqual([]);

  // Should NOT create a config.json (that would collide with engine config)
  expect(existsSync(join(testDir, '.trellis', 'agents', 'config.json'))).toBe(false);
});

test('creates skills/ and workflows/ stub directories', () => {
  writeAgentScaffold(testDir, { profile: mockProfile, context: mockContext });

  expect(existsSync(join(testDir, '.trellis', 'agents', 'skills', 'README.md'))).toBe(true);
  expect(existsSync(join(testDir, '.trellis', 'agents', 'workflows', 'README.md'))).toBe(true);

  const skillsReadme = readFileSync(
    join(testDir, '.trellis', 'agents', 'skills', 'README.md'),
    'utf-8',
  );
  expect(skillsReadme).toContain('domain-specific operating instructions');
});

test('handles null profile gracefully', () => {
  writeAgentScaffold(testDir, { profile: null, context: mockContext });

  const agentsMd = readFileSync(join(testDir, '.trellis', 'agents', 'AGENTS.md'), 'utf-8');
  expect(agentsMd).toContain('the user'); // fallback for null name
  expect(agentsMd).toContain('trellis season'); // suggestion to set up profile
});

test('handles null domain/description/ecosystem gracefully', () => {
  const emptyContext: ProjectContext = {
    domain: null,
    description: null,
    ecosystem: null,
    name: null,
    fileCount: 0,
    confidence: 'high',
    indicators: [],
  };

  writeAgentScaffold(testDir, { profile: null, context: emptyContext });

  const agentsMd = readFileSync(join(testDir, '.trellis', 'agents', 'AGENTS.md'), 'utf-8');
  expect(agentsMd).toContain('(unnamed)');
  expect(agentsMd).toContain('(not determined');
  expect(agentsMd).toContain('(no description found)');
  expect(agentsMd).toContain('unknown');
});

test('does not overwrite existing skills/workflows READMEs', () => {
  // First write
  writeAgentScaffold(testDir, { profile: mockProfile, context: mockContext });

  // Manually modify the skills README
  const skillsReadmePath = join(testDir, '.trellis', 'agents', 'skills', 'README.md');
  const { writeFileSync } = require('fs');
  writeFileSync(skillsReadmePath, '# Custom content\nUser-modified README.');

  // Second write
  writeAgentScaffold(testDir, { profile: mockProfile, context: mockContext });

  // Skills README should NOT be overwritten
  const content = readFileSync(skillsReadmePath, 'utf-8');
  expect(content).toContain('Custom content');
  expect(content).not.toContain('domain-specific operating instructions');
});

test('AGENTS.md references agent-context.json, not config.json', () => {
  writeAgentScaffold(testDir, { profile: mockProfile, context: mockContext });

  const agentsMd = readFileSync(join(testDir, '.trellis', 'agents', 'AGENTS.md'), 'utf-8');
  expect(agentsMd).toContain('agent-context.json');
  expect(agentsMd).not.toContain('Read `config.json`');
});
