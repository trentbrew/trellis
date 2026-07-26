import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TrellisVcsEngine } from '../../src/engine.js';
import { BlobStore } from '../../src/vcs/blob-store.js';
import { BlobResolver } from '../../src/vcs/blob-resolver.js';
import { inspectBlobStorage } from '../../src/cli/storage.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const cliPath = join(__dirname, '../../src/cli/index.ts');

function shellQuote(arg: string): string {
  if (/^[a-zA-Z0-9_./:-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function run(args: string[], cwd: string) {
  const env = { ...process.env };
  delete env.TRELLIS_LANE_ID;
  try {
    const stdout = execSync(
      `npx tsx ${shellQuote(cliPath)} ${args.map(shellQuote).join(' ')}`,
      { cwd, encoding: 'utf8', env, stdio: 'pipe' },
    );
    return { status: 0, stdout, stderr: '' };
  } catch (error: any) {
    return {
      status: error?.status ?? 1,
      stdout: error?.stdout?.toString?.() ?? '',
      stderr: error?.stderr?.toString?.() ?? '',
    };
  }
}

describe('trellis storage CLI', () => {
  let root: string;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'trellis-storage-cli-'));
    root = realpathSync(root);
    const eng = new TrellisVcsEngine({ rootPath: root });
    await eng.initRepo({ indexWorkspace: true });
    writeFileSync(join(root, 'tracked.txt'), 'tracked content\n');
    await eng.indexWorkspace();

    const blobStore = new BlobStore(join(root, '.trellis'));
    blobStore.putSync(Buffer.from('orphaned payload\n'));
  });

  afterAll(() => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {}
  });

  it('reports unreferenced blob usage', () => {
    const blobStore = new BlobStore(join(root, '.trellis'));
    const blobResolver = new BlobResolver(blobStore, root);
    const stats = inspectBlobStorage(root, blobResolver);
    expect(stats.unreferencedBlobs).toBe(1);

    const out = run(['storage', '-p', root], root);
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Trellis Blob Storage');
    expect(out.stdout).toContain('Unreferenced:');
    expect(out.stdout).toContain('Dry run only.');
  });

  it('prunes unreferenced blobs without touching referenced ones', () => {
    const blobStore = new BlobStore(join(root, '.trellis'));
    const blobResolver = new BlobResolver(blobStore, root);
    const before = inspectBlobStorage(root, blobResolver);
    expect(before.unreferencedBlobs).toBe(1);

    const out = run(['storage', '-p', root, '--prune'], root);
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Deleted 1 blob(s)');

    const after = inspectBlobStorage(root, blobResolver);
    expect(after.unreferencedBlobs).toBe(0);
    expect(after.referencedBlobs).toBeGreaterThan(0);
  });
});
