import { cpSync, existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { sandboxPackageJson } from '../../src/wc/constants.js';
import { packNodeModules, resolveSandboxAssetsDir } from '../../src/wc/pack.js';

const trellisRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('wc init', () => {
  it('trellis init succeeds with vendored deps + iroh stub', () => {
    if (!existsSync(path.join(trellisRoot, 'dist/cli/index.js'))) {
      return;
    }

    const dir = mkdtempSync(path.join(tmpdir(), 'wc-init-'));
    try {
      mkdirSync(path.join(dir, 'bin'), { recursive: true });
      cpSync(path.join(trellisRoot, 'bin/trellis.mjs'), path.join(dir, 'bin/trellis.mjs'));
      cpSync(path.join(trellisRoot, 'dist'), path.join(dir, 'dist'), { recursive: true });
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify(sandboxPackageJson(), null, 2));

      const assets = resolveSandboxAssetsDir(trellisRoot);
      const packed = packNodeModules(trellisRoot, path.join(assets, 'stubs'));
      for (const [rel, content] of Object.entries(packed)) {
        const dest = path.join(dir, rel);
        mkdirSync(path.dirname(dest), { recursive: true });
        if (typeof content === 'string') {
          writeFileSync(dest, content);
        } else {
          writeFileSync(dest, Buffer.from(content.binary, 'base64'));
        }
      }

      const init = spawnSync(
        process.execPath,
        [
          'bin/trellis.mjs',
          'init',
          '--no-interactive',
          '--identity',
          'skip',
          '--framework',
          'node',
        ],
        { cwd: dir, encoding: 'utf8' },
      );

      expect(init.status, init.stderr || init.stdout).toBe(0);
      expect(existsSync(path.join(dir, '.trellis/ops.json'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
