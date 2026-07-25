import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { BlobStore } from '../../src/vcs/blob-store.js';
import { BlobResolver } from '../../src/vcs/blob-resolver.js';
import { TrellisVcsEngine } from '../../src/engine.js';

function initGitRepo(root: string): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'README.md'), '# test\n');
  execSync(`git -C "${root}" init`, { encoding: 'utf-8' });
  execSync(`git -C "${root}" config user.email "test@trellis.dev"`, { encoding: 'utf-8' });
  execSync(`git -C "${root}" config user.name "Test"`, { encoding: 'utf-8' });
  execSync(`git -C "${root}" add -A`, { encoding: 'utf-8' });
  execSync(`git -C "${root}" commit -m "init"`, { encoding: 'utf-8' });
}

describe('lazy blobbing', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'trellis-lazy-blob-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('canSkipPut returns true when disk file hash matches contentHash', () => {
    const blobStore = new BlobStore(join(root, '.trellis'));
    const resolver = new BlobResolver(blobStore, root);

    const content = Buffer.from('lazy blob content');
    const hash = blobStore.putSync(content);

    initGitRepo(root);
    const filePath = join(root, 'tracked.txt');
    writeFileSync(filePath, content);
    execSync(`git -C "${root}" add tracked.txt`, { encoding: 'utf-8' });
    execSync(`git -C "${root}" commit -m "add"`, { encoding: 'utf-8' });

    expect(resolver.canSkipPut('tracked.txt', hash)).toBe(true);
  });

  it('canSkipPut returns false when file does not exist on disk', () => {
    const blobStore = new BlobStore(join(root, '.trellis'));
    const resolver = new BlobResolver(blobStore, root);

    initGitRepo(root);
    expect(resolver.canSkipPut('missing.txt', 'abc123')).toBe(false);
  });

  it('canSkipPut returns false when not inside a git repo', () => {
    const blobStore = new BlobStore(join(root, '.trellis'));
    const resolver = new BlobResolver(blobStore, root);

    const content = Buffer.from('some content');
    const hash = blobStore.putSync(content);
    writeFileSync(join(root, 'nogit.txt'), content);

    expect(resolver.canSkipPut('nogit.txt', hash)).toBe(false);
  });

  it('canSkipPut returns false when disk file content does not match contentHash', () => {
    const blobStore = new BlobStore(join(root, '.trellis'));
    const resolver = new BlobResolver(blobStore, root);

    initGitRepo(root);
    const filePath = join(root, 'stale.txt');
    writeFileSync(filePath, 'on disk');
    execSync(`git -C "${root}" add stale.txt`, { encoding: 'utf-8' });
    execSync(`git -C "${root}" commit -m "add"`, { encoding: 'utf-8' });

    expect(resolver.canSkipPut('stale.txt', 'wronghash')).toBe(false);
  });

  it('engine getBlobResolver resolves and canSkipPut works for tracked files', () => {
    const engine = new TrellisVcsEngine({ rootPath: root, agentId: 'test:agent' });
    engine.initRepo({ indexWorkspace: false });

    initGitRepo(root);
    const trackedFile = join(root, 'tracked.txt');
    writeFileSync(trackedFile, 'engine lazy blob content');
    execSync(`git -C "${root}" add tracked.txt`, { encoding: 'utf-8' });
    execSync(`git -C "${root}" commit -m "add"`, { encoding: 'utf-8' });

    const resolver = engine.getBlobResolver();
    expect(resolver).not.toBeNull();

    const contentHash = resolver!.getBlobStore().putSync(Buffer.from('engine lazy blob content'));
    expect(resolver!.canSkipPut('tracked.txt', contentHash)).toBe(true);
  });

  it('engine getBlobResolver canSkipPut returns false for mismatched content', () => {
    const engine = new TrellisVcsEngine({ rootPath: root, agentId: 'test:agent' });
    engine.initRepo({ indexWorkspace: false });

    initGitRepo(root);
    const trackedFile = join(root, 'stale.txt');
    writeFileSync(trackedFile, 'on disk content');
    execSync(`git -C "${root}" add stale.txt`, { encoding: 'utf-8' });
    execSync(`git -C "${root}" commit -m "add"`, { encoding: 'utf-8' });

    const resolver = engine.getBlobResolver();
    expect(resolver).not.toBeNull();

    const differentContent = Buffer.from('different content');
    const differentHash = resolver!.getBlobStore().putSync(differentContent);
    expect(resolver!.canSkipPut('stale.txt', differentHash)).toBe(false);
  });
});