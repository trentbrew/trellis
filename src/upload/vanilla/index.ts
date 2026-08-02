/**
 * Upload Vanilla — framework-free bindings (ADR 0034 wedge 5).
 *
 * Import from `trellis/upload/vanilla`:
 *
 *   const upload = createVanillaUpload({ transport: httpTransport });
 *   upload.actions.add({ id: 'a1', name: 'photo.png', size: 2048 });
 *   upload.subscribe(() => render(upload.state));
 *
 * @module trellis/upload/vanilla
 */

import { createUploadCore } from '../core/index.js';
import type { UploadConfig, UseUploadReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type UploadInput = UploadConfig | UseUploadReturn;

function asUploadCore(input: UploadInput): UseUploadReturn {
  return 'actions' in input ? input : createUploadCore(input);
}

/**
 * Create a framework-free upload list from a config or an existing core
 * (to share one mount across adapters) with the standard core surface.
 */
export function createVanillaUpload(input: UploadInput): UseUploadReturn {
  return asUploadCore(input);
}
