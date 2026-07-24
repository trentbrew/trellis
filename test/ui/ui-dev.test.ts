import { describe, it, expect } from 'vitest';
import { liveReloadClientSource, uiDevOutDir } from '../../src/ui/ui-dev.js';

describe('ui-dev', () => {
  it('live reload client listens for css and reload events', () => {
    const src = liveReloadClientSource();
    expect(src).toContain("addEventListener('css'");
    expect(src).toContain("addEventListener('reload'");
    expect(src).toContain('/__dev/reload');
  });

  it('uiDevOutDir resolves under repo .trellis', () => {
    expect(uiDevOutDir('/tmp/repo')).toBe('/tmp/repo/.trellis/ui-dev');
  });
});
