import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const trellisRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const publicDir = path.join(trellisRoot, 'apps/wc-sandbox/public');

describe('wc-sandbox vercel build', () => {
  it('public/ has index.html + bootstrap.json after wc-sandbox-build', () => {
    const indexPath = path.join(publicDir, 'index.html');
    const bootstrapPath = path.join(publicDir, 'bootstrap.json');
    expect(fs.existsSync(indexPath), 'run: just wc-sandbox-build').toBe(true);
    expect(fs.existsSync(bootstrapPath), 'run: just wc-sandbox-build').toBe(true);

    const bootstrap = JSON.parse(fs.readFileSync(bootstrapPath, 'utf8')) as {
      version?: string;
      dist?: Record<string, string>;
      nodeModules?: Record<string, unknown>;
      binTrellis?: string;
    };
    expect(bootstrap.version).toBeTruthy();
    expect(bootstrap.binTrellis).toContain('dist/cli');
    expect(Object.keys(bootstrap.dist ?? {}).length).toBeGreaterThan(10);
    expect(Object.keys(bootstrap.nodeModules ?? {}).length).toBeGreaterThan(100);
  });
});
