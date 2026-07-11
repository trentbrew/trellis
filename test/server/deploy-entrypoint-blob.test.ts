/**
 * Smoke: sprite deploy entrypoint wires BlobStore into presenceRelay (TRL-97).
 */
import { describe, expect, it } from 'vitest';
import { generateServerEntrypoint } from '../../src/server/deploy.js';

describe('generateServerEntrypoint blob wiring', () => {
  it('imports BlobStore and mounts blobStore under /home/sprite/trellis-db', () => {
    const script = generateServerEntrypoint({
      port: 8080,
      apiKey: 'spk_test',
      jwtSecret: 'jws_test',
    });

    expect(script).toContain('BlobStore');
    expect(script).toMatch(
      /import\s*\{[^}]*BlobStore[^}]*\}\s*from/,
    );
    expect(script).toContain('blobStore:');
    expect(script).toContain("new BlobStore('/home/sprite/trellis-db')");
    expect(script).toContain("path: '/rt'");
    // Must not bake the old /rt-only boolean.
    expect(script).not.toMatch(/presenceRelay:\s*true\b/);
  });
});
