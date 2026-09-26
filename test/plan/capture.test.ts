import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TrellisVcsEngine } from '../../src/engine.js';
import {
  capturePlanArtifact,
  linkPlanToIssue,
  parsePlanFrontmatter,
  planArtifactRelPath,
  serializePlanDocument,
  splitFrontmatter,
} from '../../src/plan/index.js';

describe('plan frontmatter', () => {
  it('round-trips core fields', () => {
    const doc = serializePlanDocument(
      {
        name: 'Profile eval',
        status: 'proposed',
        issue: 'TRL-334',
        date: '2026-09-23',
        source: {
          tool: 'cursor',
          path: '/tmp/foo.plan.md',
          capturedAt: '2026-09-23T00:00:00.000Z',
        },
        todos: [{ id: 'a', content: 'step', status: 'pending' }],
      },
      '# Body\n',
    );
    const split = splitFrontmatter(doc);
    expect(split).not.toBeNull();
    const parsed = parsePlanFrontmatter(split!.frontmatter);
    expect(parsed.name).toBe('Profile eval');
    expect(parsed.issue).toBe('TRL-334');
    expect(parsed.todos?.[0]?.id).toBe('a');
    expect(split!.body).toContain('# Body');
  });
});

describe('capturePlanArtifact', () => {
  let root: string;
  let home: string;

  beforeEach(async () => {
    root = join(tmpdir(), `trellis-plan-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    home = join(root, 'home');
    mkdirSync(home, { recursive: true });
    const engine = new TrellisVcsEngine({ rootPath: root });
    await engine.initRepo({ indexWorkspace: false });
    await engine.createIssue('Plan capture test', { forceIssueId: 'TRL-9001' });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('captures from explicit path and preserves cursor todos', () => {
    const sourceDir = join(home, '.cursor', 'plans');
    mkdirSync(sourceDir, { recursive: true });
    const sourcePath = join(sourceDir, 'test_ab12cd34.plan.md');
    writeFileSync(
      sourcePath,
      `---
name: Source plan
overview: From cursor
todos:
  - id: one
    content: Do thing
    status: pending
isProject: false
---
# Plan body
`,
      'utf-8',
    );

    const result = capturePlanArtifact({
      rootPath: root,
      issueId: 'TRL-9001',
      origin: 'path',
      sourcePath,
      homeDir: home,
    });

    expect(result.created).toBe(true);
    expect(result.relPath).toBe('docs/plans/TRL-9001-plan.md');
    expect(existsSync(result.absPath)).toBe(true);
    const written = readFileSync(result.absPath, 'utf-8');
    expect(written).toContain('Source plan');
    expect(written).toContain('tool: path');
    expect(written).toContain('- id: one');
    expect(written).toContain('# Plan body');
  });

  it('links issue description with wiki path', async () => {
    const planPath = join(root, planArtifactRelPath('TRL-9001'));
    mkdirSync(join(root, 'docs', 'plans'), { recursive: true });
    writeFileSync(planPath, '# existing\n', 'utf-8');

    const engine = new TrellisVcsEngine({ rootPath: root });
    engine.open();
    await linkPlanToIssue(engine, 'TRL-9001');
    const issue = engine.getIssue('TRL-9001');
    expect(issue?.description).toContain('[[docs/plans/TRL-9001-plan.md]]');
  });
});
