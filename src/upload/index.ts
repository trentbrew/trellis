/**
 * Headless Upload — Public API Surface (ADR 0034 wedge 5).
 *
 * The core is framework-free, DOM-free, and timer-free (transfers only
 * advance through the injected transport's callbacks); adapters live in
 * subpaths:
 *
 *   import { createUploadCore } from 'trellis/upload';
 *   import { useUpload } from 'trellis/upload/react';
 *   import { useUploadVue } from 'trellis/upload/vue';
 *   import { createUploadStore } from 'trellis/upload/svelte';
 *   import { createVanillaUpload } from 'trellis/upload/vanilla';
 *
 * @module trellis/upload
 */

export { createUploadCore } from './core/index.js';
export type {
  UploadActions,
  UploadCallbacks,
  UploadConfig,
  UploadHandle,
  UploadItem,
  UploadState,
  UploadStatus,
  UploadTaskState,
  UploadTransport,
  UseUploadReturn,
} from './core/index.js';
