import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisVcsEngine } from '../../src/engine.js';
import { isIssueMutation, runIssueMutation } from '../../src/ui/issue-mutations.js';

describe('runIssueMutation', () => {
  let root: string;
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'issue-mut-'));
    engine = new TrellisVcsEngine({ rootPath: root });
    await engine.initRepo({ indexWorkspace: false });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('allows only the planning subset of the lifecycle', () => {
    expect(isIssueMutation('issueCreate')).toBe(true);
    expect(isIssueMutation('issueUpdate')).toBe(true);
    expect(isIssueMutation('issueClose')).toBe(false);
    expect(isIssueMutation('issueStart')).toBe(false);
    expect(isIssueMutation(undefined)).toBe(false);
  });

  it('creates an issue and returns its id', async () => {
    const { issueId } = await runIssueMutation(engine, 'issueCreate', {
      title: 'From admin',
      priority: 'high',
      labels: ['ui'],
      status: 'backlog',
    });
    const issue = engine.getIssue(issueId);
    expect(issue?.title).toBe('From admin');
    expect(issue?.priority).toBe('high');
    expect(issue?.labels).toEqual(['ui']);
    expect(issue?.status).toBe('backlog');
  });

  it('updates fields and clears a parent with an empty value', async () => {
    const { issueId: parentId } = await runIssueMutation(engine, 'issueCreate', { title: 'Epic' });
    const { issueId } = await runIssueMutation(engine, 'issueCreate', { title: 'Leaf', parentId });
    expect(engine.getIssue(issueId)?.parentId).toBe(parentId);

    await runIssueMutation(engine, 'issueUpdate', {
      id: issueId,
      description: 'More detail',
      status: 'queue',
      parentId: '',
    });
    const issue = engine.getIssue(issueId);
    expect(issue?.description).toBe('More detail');
    expect(issue?.status).toBe('queue');
    expect(issue?.parentId).toBeFalsy();
  });

  it('refuses statuses that have their own CLI verbs', async () => {
    const { issueId } = await runIssueMutation(engine, 'issueCreate', { title: 'Guarded' });
    for (const status of ['closed', 'in_progress', 'paused']) {
      await expect(
        runIssueMutation(engine, 'issueUpdate', { id: issueId, status }),
      ).rejects.toThrow(/not settable over HTTP/);
    }
    expect(engine.getIssue(issueId)?.status).not.toBe('closed');
  });

  it('rejects bad input before touching the engine', async () => {
    await expect(runIssueMutation(engine, 'issueCreate', {})).rejects.toThrow(/title required/);
    await expect(
      runIssueMutation(engine, 'issueCreate', { title: 'x', priority: 'urgent' }),
    ).rejects.toThrow(/invalid priority/);
    await expect(
      runIssueMutation(engine, 'issueCreate', { title: 'x', labels: 'ui' }),
    ).rejects.toThrow(/string array/);
  });
});
