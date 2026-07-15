/**
 * QR helpers for device pairing payloads (ADR 0020 Phase 1).
 *
 * Encodes the same OOB strings as Phase 0 (`trellis:pair:v1:…` etc.) for
 * terminal display. Studio / camera decode is a later surface.
 *
 * Challenge payloads are ~400–500 chars, so terminal QRs are large. Default
 * ECC is `L` to keep module count down; paste remains the reliable fallback.
 */

import { encode, renderUnicodeCompact } from 'uqr';

export type PairQrEcc = 'L' | 'M' | 'Q' | 'H';

export interface PairQrOptions {
  /** Default L — full pair payloads need a small version to fit a terminal. */
  ecc?: PairQrEcc;
  /** Quiet-zone modules. Default 1 (compact terminal). */
  border?: number;
}

/**
 * Compact Unicode QR (▀▄█) sized for terminals.
 * Returns a multi-line string ready for `console.log`.
 */
export function renderPairingQr(
  payload: string,
  opts?: PairQrOptions,
): string {
  return renderUnicodeCompact(payload, {
    ecc: opts?.ecc ?? 'L',
    border: opts?.border ?? 1,
  });
}

/** Raw boolean matrix + metadata (tests / SVG / future surfaces). */
export function encodePairingQr(payload: string, opts?: PairQrOptions) {
  return encode(payload, {
    ecc: opts?.ecc ?? 'L',
    border: opts?.border ?? 1,
  });
}
