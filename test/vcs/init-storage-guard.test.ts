import { describe, expect, it } from 'vitest';
import {
  applyInitIndexGate,
  estimateWorkspaceScan,
  exceedsInitIndexThreshold,
  getUmbrellaInitWarning,
  INIT_INDEX_MAX_BYTES,
  INIT_INDEX_MAX_FILES,
} from '../../src/vcs/init-storage-guard.js';
import { DEFAULT_CONFIG } from '../../src/vcs/types.js';

describe('init-storage-guard', () => {
  it('defaults indexWorkspace to false in DEFAULT_CONFIG', () => {
    expect(DEFAULT_CONFIG.indexWorkspace).toBe(false);
    expect(DEFAULT_CONFIG.ignorePatterns).toContain('.vercel');
    expect(DEFAULT_CONFIG.ignorePatterns).toContain('.next');
  });

  it('detects umbrella paths without repo markers', () => {
    const warning = getUmbrellaInitWarning('/Users/me/TURTLE/Projects/Apps');
    expect(warning).toContain('Projects');
    expect(warning).toContain('--minimal');
  });

  it('skips umbrella warning when package.json exists', () => {
    const warning = getUmbrellaInitWarning(process.cwd());
    expect(warning).toBeUndefined();
  });

  it('blocks large implicit indexing without explicit opt-in', async () => {
    const estimate = {
      fileCount: INIT_INDEX_MAX_FILES + 1,
      totalBytes: 1024,
    };
    expect(exceedsInitIndexThreshold(estimate)).toBe(true);

    const gate = await applyInitIndexGate({
      rootPath: process.cwd(),
      indexWorkspace: true,
      explicitIndexWorkspace: false,
      isInteractive: false,
    });

    if (exceedsInitIndexThreshold(estimateWorkspaceScan(process.cwd()))) {
      expect(gate.ok).toBe(false);
      if (!gate.ok) {
        expect(gate.message).toContain('--index-workspace');
      }
    } else {
      expect(gate.ok).toBe(true);
    }
  });

  it('allows large indexing with explicit --index-workspace', async () => {
    const gate = await applyInitIndexGate({
      rootPath: process.cwd(),
      indexWorkspace: true,
      explicitIndexWorkspace: true,
      isInteractive: false,
    });
    expect(gate.ok).toBe(true);
    if (gate.ok) {
      expect(gate.indexWorkspace).toBe(true);
    }
  });
});
