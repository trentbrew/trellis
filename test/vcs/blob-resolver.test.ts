import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { BlobStore } from '../../src/vcs/blob-store.js';
import { BlobResolver } from '../../src/vcs/blob-resolver.js';

function initGitRepo(root: string): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'README.md'), '# test\n');
  execSync(`git -C "${root}" init`, { encoding: 'utf-8' });
  execSync(`git -C "${root}" config user.email "test@trellis.dev"`, { encoding: 'utf-8' });
  execSync(`git -C "${root}" config user.name "Test"`, { encoding: 'utf-8' });
  execSync(`git -C "${root}" add -A`, { encoding: 'utf-8' });
  execSync(`git -C "${root}" commit -m "init"`, { encoding: 'utf-8' });
}

function sha256Hex(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

describe('BlobResolver', () => {
  let root: string;
  let trellisDir: string;
  let blobStore: BlobStore;
  let resolver: BlobResolver;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'trellis-blob-resolver-'));
    trellisDir = join(root, '.trellis');
    mkdirSync(trellisDir, { recursive: true });
    blobStore = new BlobStore(trellisDir);
    resolver = new BlobResolver(blobStore, root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe('get() — ordered lookup', () => {
    it('returns blob from local store when present', () => {
      const content = Buffer.from('hello world');
      const hash = blobStore.putSync(content);
      const result = resolver.get(hash);
      expect(result).toEqual(content);
    });

    it('returns null when blob is not in local store and no git repo', () => {
      const hash = sha256Hex(Buffer.from('unknown content'));
      const result = resolver.get(hash);
      expect(result).toBeNull();
    });

    it('falls back to git worktree when blob is not in local store', () => {
      const content = Buffer.from('git-tracked content');
      const hash = sha256Hex(content);
      initGitRepo(root);
      const filePath = join(root, 'tracked.txt');
      writeFileSync(filePath, content);
      execSync(`git -C "${root}" add tracked.txt`, { encoding: 'utf-8' });
      execSync(`git -C "${root}" commit -m "add tracked"`, { encoding: 'utf-8' });

      const result = resolver.get(hash, 'tracked.txt');
      expect(result).toEqual(content);
    });

    it('returns null when git file exists but hash does not match', () => {
      initGitRepo(root);
      const filePath = join(root, 'mismatch.txt');
      writeFileSync(filePath, 'different content');
      execSync(`git -C "${root}" add mismatch.txt`, { encoding: 'utf-8' });
      execSync(`git -C "${root}" commit -m "add mismatch"`, { encoding: 'utf-8' });

      const wrongHash = sha256Hex(Buffer.from('unknown content'));
      const result = resolver.get(wrongHash, 'mismatch.txt');
      expect(result).toBeNull();
    });
  });

  describe('has()', () => {
    it('returns true when local blob exists', () => {
      const content = Buffer.from('local blob');
      const hash = blobStore.putSync(content);
      expect(resolver.has(hash)).toBe(true);
    });

    it('returns true when git file matches hash', () => {
      const content = Buffer.from('git blob');
      const hash = sha256Hex(content);
      initGitRepo(root);
      writeFileSync(join(root, 'file.txt'), content);
      execSync(`git -C "${root}" add file.txt`, { encoding: 'utf-8' });
      execSync(`git -C "${root}" commit -m "add"`, { encoding: 'utf-8' });
      expect(resolver.has(hash, 'file.txt')).toBe(true);
    });

    it('returns false when neither source has the hash', () => {
      const hash = sha256Hex(Buffer.from('missing'));
      expect(resolver.has(hash)).toBe(false);
    });
  });

  describe('hasLocal()', () => {
    it('returns true only for blobs in the local store', () => {
      const content = Buffer.from('local only');
      const hash = blobStore.putSync(content);
      expect(resolver.hasLocal(hash)).toBe(true);

      const gitHash = sha256Hex(Buffer.from('git only'));
      initGitRepo(root);
      writeFileSync(join(root, 'gitfile.txt'), 'git only');
      execSync(`git -C "${root}" add gitfile.txt`, { encoding: 'utf-8' });
      execSync(`git -C "${root}" commit -m "add"`, { encoding: 'utf-8' });
      expect(resolver.hasLocal(gitHash)).toBe(false);
    });
  });

  describe('isGitRepo()', () => {
    it('returns false when not inside a git repo', () => {
      expect(resolver.isGitRepo()).toBe(false);
    });

    it('returns true when inside a git repo', () => {
      initGitRepo(root);
      expect(resolver.isGitRepo()).toBe(true);
    });
  });

  describe('canSkipPut()', () => {
    it('returns false when not a git repo', () => {
      const content = Buffer.from('some content');
      const hash = sha256Hex(content);
      writeFileSync(join(root, 'file.txt'), content);
      expect(resolver.canSkipPut('file.txt', hash)).toBe(false);
    });

    it('returns false when file does not exist on disk', () => {
      initGitRepo(root);
      const hash = sha256Hex(Buffer.from('content'));
      expect(resolver.canSkipPut('nonexistent.txt', hash)).toBe(false);
    });

    it('returns false when file content does not match hash', () => {
      initGitRepo(root);
      writeFileSync(join(root, 'file.txt'), 'different content');
      expect(resolver.canSkipPut('file.txt', 'wronghash')).toBe(false);
    });

    it('returns true when file exists on disk and hash matches', () => {
      const content = Buffer.from('tracked content');
      const hash = sha256Hex(content);
      initGitRepo(root);
      writeFileSync(join(root, 'file.txt'), content);
      execSync(`git -C "${root}" add file.txt`, { encoding: 'utf-8' });
      execSync(`git -C "${root}" commit -m "add"`, { encoding: 'utf-8' });
      expect(resolver.canSkipPut('file.txt', hash)).toBe(true);
    });
  });

  describe('resolveFromGit()', () => {
    it('returns file content when hash matches', () => {
      const content = Buffer.from('resolved content');
      const hash = sha256Hex(content);
      initGitRepo(root);
      const filePath = join(root, 'resolved.txt');
      writeFileSync(filePath, content);
      execSync(`git -C "${root}" add resolved.txt`, { encoding: 'utf-8' });
      execSync(`git -C "${root}" commit -m "add"`, { encoding: 'utf-8' });

      const result = resolver.resolveFromGit(hash, filePath);
      expect(result).toEqual(content);
    });

    it('returns null when hash does not match', () => {
      initGitRepo(root);
      const filePath = join(root, 'nomatch.txt');
      writeFileSync(filePath, 'content');
      execSync(`git -C "${root}" add nomatch.txt`, { encoding: 'utf-8' });
      execSync(`git -C "${root}" commit -m "add"`, { encoding: 'utf-8' });

      const result = resolver.resolveFromGit('wronghash', filePath);
      expect(result).toBeNull();
    });

    it('returns null when file does not exist', () => {
      initGitRepo(root);
      const result = resolver.resolveFromGit('somehash', join(root, 'missing.txt'));
      expect(result).toBeNull();
    });
  });

  describe('getBlobStore()', () => {
    it('returns the underlying BlobStore instance', () => {
      expect(resolver.getBlobStore()).toBe(blobStore);
    });
  });
});