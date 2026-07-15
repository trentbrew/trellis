import { describe, test, expect } from 'vitest';
import {
  renderPairingQr,
  encodePairingQr,
  PAIR_PREFIX,
  encodePayload,
} from '../../src/identity/index.js';

describe('pairing QR', () => {
  const samplePayload = encodePayload(PAIR_PREFIX, {
    v: 1,
    challengeId: 'ch_demo',
    did: 'did:key:z6Mkdemo',
    identityEntityId: 'identity:did:key:z6Mkdemo',
    rootPublicKey: 'MCowBQYDK2VwAyEAdemo',
    exp: Math.floor(Date.now() / 1000) + 300,
    nonce: 'aabbccddeeff00112233445566778899',
  });

  test('renderPairingQr returns compact unicode matrix', () => {
    const qr = renderPairingQr(samplePayload);
    expect(qr.includes('\n')).toBe(true);
    // Compact renderer: U+2580, U+2584, U+2588 half/full blocks
    const hasHalfBlock = [...qr].some((c) => {
      const cp = c.codePointAt(0);
      return cp === 0x2580 || cp === 0x2584 || cp === 0x2588;
    });
    expect(hasHalfBlock).toBe(true);
    expect(qr.length).toBeGreaterThan(40);
  });

  test('encodePairingQr yields square boolean matrix', () => {
    const { data, size } = encodePairingQr(samplePayload);
    expect(size).toBeGreaterThan(20);
    expect(data).toHaveLength(size);
    expect(data[0]).toHaveLength(size);
    expect(typeof data[0][0]).toBe('boolean');
  });
});
