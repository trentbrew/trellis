import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_TURTLE_ADMIN_URL,
  resolveAdminOpenTarget,
} from '../../src/cli/admin.js';

const kernelUrl = 'http://127.0.0.1:3939/';

describe('resolveAdminOpenTarget', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('prefers TRELLIS_ADMIN_URL over probes', async () => {
    process.env.TRELLIS_ADMIN_URL = 'http://127.0.0.1:9999/';
    const probe = vi.fn(async () => true);
    const result = await resolveAdminOpenTarget(kernelUrl, probe);
    expect(result).toEqual({ url: 'http://127.0.0.1:9999/', label: 'TRELLIS_ADMIN_URL' });
    expect(probe).not.toHaveBeenCalled();
  });

  it('opens turtle-admin when its probe succeeds', async () => {
    delete process.env.TRELLIS_ADMIN_URL;
    delete process.env.TURTLE_ADMIN_URL;
    const probe = vi.fn(async (url: string) => url === DEFAULT_TURTLE_ADMIN_URL);
    const result = await resolveAdminOpenTarget(kernelUrl, probe);
    expect(result).toEqual({ url: DEFAULT_TURTLE_ADMIN_URL, label: 'turtle-admin' });
    expect(probe).toHaveBeenCalledWith(DEFAULT_TURTLE_ADMIN_URL);
  });

  it('uses TURTLE_ADMIN_URL for the turtle-admin probe', async () => {
    delete process.env.TRELLIS_ADMIN_URL;
    process.env.TURTLE_ADMIN_URL = 'http://127.0.0.1:4950';
    const probe = vi.fn(async (url: string) => url === 'http://127.0.0.1:4950');
    const result = await resolveAdminOpenTarget(kernelUrl, probe);
    expect(result.label).toBe('turtle-admin');
    expect(probe).toHaveBeenNthCalledWith(1, 'http://127.0.0.1:4950');
  });

  it('falls back to playground when turtle-admin is down', async () => {
    delete process.env.TRELLIS_ADMIN_URL;
    const playground = 'http://127.0.0.1:3000/vcs';
    process.env.TRELLIS_PLAYGROUND_URL = playground;
    const probe = vi.fn(async (url: string) => url === playground);
    const result = await resolveAdminOpenTarget(kernelUrl, probe);
    expect(result).toEqual({ url: playground, label: 'playground /vcs' });
  });

  it('falls back to kernel when no external UI responds', async () => {
    delete process.env.TRELLIS_ADMIN_URL;
    const probe = vi.fn(async () => false);
    const result = await resolveAdminOpenTarget(kernelUrl, probe);
    expect(result).toEqual({ url: kernelUrl, label: 'kernel / (bundled UI)' });
  });
});
