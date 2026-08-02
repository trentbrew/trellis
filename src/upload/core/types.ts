/**
 * Upload core types — the transfer state-machine contract
 * (ADR 0034 §6, wedge 5).
 *
 * Per-item lifecycle: `idle → uploading → (processing) → done`, with
 * `error` at any transfer point. The core owns queueing, concurrency
 * limits, progress bookkeeping, cancel/retry, and idempotency; the actual
 * I/O is injected through an `UploadTransport` (framework-free, DOM-free,
 * Node-testable).
 *
 * @module trellis/upload
 */

/** Per-item lifecycle (ADR 0034 §6.5). */
export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'error' | 'done';

export interface UploadItem {
  /** Stable task id (owner-generated, unique within a list). */
  id: string;
  /**
   * Idempotency key: `add` skips items whose key already exists in the
   * list, so re-adding (and retry) never duplicates a transfer. Items
   * without a key are never deduped.
   */
  key?: string;
  name: string;
  /** Total bytes. */
  size: number;
  /** Mime type hint (renders icons, nothing more). */
  type?: string;
  /** Opaque payload the transport uploads (blob, File, handle, …). */
  data?: unknown;
}

export interface UploadTaskState {
  id: string;
  /** Idempotency key (null when the item had none). */
  key: string | null;
  name: string;
  size: number;
  type: string | null;
  status: UploadStatus;
  /** Bytes transferred so far (clamped to size). */
  transferred: number;
  /** Last failure message (status === 'error'). */
  error: string | null;
  /** Derived: transferred / size (1 when done; 0 when size is 0). */
  progress: number;
  /** Derived: uploading or processing. */
  busy: boolean;
  /** Derived: transfer in flight, interruptible. */
  canCancel: boolean;
  /** Derived: failed, retryable. */
  canRetry: boolean;
}

export interface UploadState {
  /** All tasks, in insertion order (active first as the queue advances). */
  tasks: UploadTaskState[];
  /** Derived: any task busy. */
  uploading: boolean;
  /** Derived: aggregate transferred / total size over all tasks. */
  progress: number;
  /** Derived: tasks in status 'done'. */
  doneCount: number;
  /** Derived: tasks in status 'error'. */
  errorCount: number;
}

/**
 * Progress/status callbacks the transport fires during a transfer.
 * The core ignores callbacks for tasks that no longer exist (cancelled).
 */
export interface UploadCallbacks {
  /** Report bytes transferred (monotonic; the core clamps to size). */
  onProgress(bytes: number): void;
  /**
   * Signal server-side processing after the bytes landed; the task holds
   * its concurrency slot until the promise resolves.
   */
  onProcessing(): void;
}

/** Handle returned by the transport: settle to succeed/fail, cancel to abort. */
export interface UploadHandle {
  /** Resolves on success, rejects on failure. */
  promise: Promise<unknown>;
  /** Abort the in-flight transfer (its promise should reject). */
  cancel(): void;
}

/** Injected I/O — the only DOM/network-touching surface (ADR 0034 §6.5). */
export interface UploadTransport {
  upload(item: UploadItem, callbacks: UploadCallbacks): UploadHandle;
}

export interface UploadConfig {
  /** Required: the transport that actually moves bytes. */
  transport: UploadTransport;
  /** Max simultaneous transfers. Default 3; `<= 0` means unlimited. */
  maxConcurrent?: number;
}

export interface UploadActions {
  /** Enqueue item(s); skips items whose idempotency key already exists. */
  add(items: UploadItem | UploadItem[]): void;
  /** Cancel an in-flight upload: aborts the transport and removes it. */
  cancel(id: string): boolean;
  /** Re-enqueue a failed task (resets transferred/error). */
  retry(id: string): boolean;
  /** Remove a non-transferring task (idle/error/done/processing). */
  remove(id: string): boolean;
}

export interface UseUploadReturn {
  readonly state: UploadState;
  readonly actions: UploadActions;
  subscribe(listener: () => void): () => void;
}
