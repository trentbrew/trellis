/**
 * Upload core — transfer state machine (ADR 0034 wedge 5).
 *
 * Framework-free, DOM-free, timer-free: the only moving parts are the
 * injected transport's promise settlements and the caller's explicit
 * actions, so every behavior is deterministic and testable in Node.
 *
 *   const upload = createUploadCore({ transport: myHttpTransport });
 *   upload.actions.add({ id: 'a1', name: 'photo.png', size: 2048, data: blob });
 *
 * The transport reports progress through callbacks; the core owns the
 * queue (FIFO), the concurrency limit, cancel/retry, and idempotency —
 * dependency of composer-core attachments (the chat flagship) and the
 * sprite. Anatomy reference: ui-thing Attachment.
 *
 * @module trellis/upload
 */

import type {
  UploadActions,
  UploadCallbacks,
  UploadConfig,
  UploadItem,
  UploadState,
  UploadTaskState,
  UploadTransport,
  UseUploadReturn,
} from './types.js';

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
} from './types.js';

/** Raw task record — derived fields are projected by `deriveState`. */
interface RawTask {
  id: string;
  key: string | null;
  name: string;
  size: number;
  type: string | null;
  status: UploadTaskState['status'];
  transferred: number;
  error: string | null;
  data: unknown;
}

interface RunningTask {
  task: RawTask;
  handle: ReturnType<UploadTransport['upload']>;
}

export function createUploadCore(config: UploadConfig): UseUploadReturn {
  const transport = config.transport;
  const maxConcurrent = config.maxConcurrent ?? 3;

  const tasks: RawTask[] = [];
  const running = new Map<string, RunningTask>();
  let state = deriveState();
  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  function project(task: RawTask): UploadTaskState {
    const busy = task.status === 'uploading' || task.status === 'processing';
    return {
      id: task.id,
      key: task.key,
      name: task.name,
      size: task.size,
      type: task.type,
      status: task.status,
      transferred: task.transferred,
      error: task.error,
      progress:
        task.status === 'done'
          ? 1
          : task.size > 0
            ? task.transferred / task.size
            : 0,
      busy,
      canCancel: task.status === 'uploading',
      canRetry: task.status === 'error',
    };
  }

  function deriveState(): UploadState {
    let totalBytes = 0;
    let transferredBytes = 0;
    let busy = false;
    let done = 0;
    let errors = 0;
    for (const task of tasks) {
      totalBytes += task.size;
      transferredBytes += task.transferred;
      busy = busy || project(task).busy;
      if (task.status === 'done') done += 1;
      if (task.status === 'error') errors += 1;
    }
    return {
      tasks: tasks.map(project),
      uploading: busy,
      progress: totalBytes > 0 ? transferredBytes / totalBytes : 0,
      doneCount: done,
      errorCount: errors,
    };
  }

  function refresh(): void {
    state = deriveState();
    notify();
  }

  function slotFree(): boolean {
    if (maxConcurrent <= 0) return true;
    return running.size < maxConcurrent;
  }

  function startNext(): void {
    // FIFO: first idle task that isn't already running.
    for (const task of tasks) {
      if (task.status !== 'idle' || running.has(task.id)) continue;
      if (!slotFree()) return;
      start(task);
    }
  }

  function start(task: RawTask): void {
    const callbacks: UploadCallbacks = {
      onProgress: (bytes) => {
        if (!running.has(task.id)) return; // cancelled — ignore late callbacks
        task.transferred = Math.min(Math.max(0, bytes), task.size);
        refresh();
      },
      onProcessing: () => {
        if (!running.has(task.id)) return;
        task.status = 'processing';
        task.transferred = task.size;
        refresh();
      },
    };

    task.status = 'uploading';
    task.transferred = 0;
    task.error = null;
    const handle = transport.upload(
      {
        id: task.id,
        key: task.key ?? undefined,
        name: task.name,
        size: task.size,
        type: task.type ?? undefined,
        data: task.data,
      },
      callbacks,
    );
    running.set(task.id, { task, handle });

    handle.promise.then(
      () => {
        if (!running.has(task.id)) return; // cancelled — already notified
        task.status = 'done';
        task.transferred = task.size;
        running.delete(task.id);
        refresh();
        startNext();
      },
      (err: unknown) => {
        if (!running.has(task.id)) return;
        task.status = 'error';
        task.error =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Upload failed';
        running.delete(task.id);
        refresh();
        startNext();
      },
    );

    refresh();
  }

  const actions: UploadActions = {
    add: (items) => {
      const batch = Array.isArray(items) ? items : [items];
      let changed = false;
      for (const item of batch) {
        if (item.key !== undefined && item.key !== null) {
          const dup = tasks.some(
            (t) => t.key === item.key && t.status !== 'error' && t.status !== 'done',
          );
          if (dup) continue; // idempotent: never start a duplicate transfer
        }
        if (tasks.some((t) => t.id === item.id)) continue; // same id never twice
        tasks.push({
          id: item.id,
          key: item.key ?? null,
          name: item.name,
          size: Math.max(0, item.size),
          type: item.type ?? null,
          status: 'idle',
          transferred: 0,
          error: null,
          data: item.data,
        });
        changed = true;
      }
      if (!changed) return;
      refresh();
      startNext();
    },

    cancel: (id) => {
      const current = running.get(id);
      if (!current) return false; // only in-flight transfers are cancellable
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;
      running.delete(id);
      tasks.splice(index, 1);
      current.handle.cancel();
      refresh();
      startNext();
      return true;
    },

    retry: (id) => {
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;
      const task = tasks[index]!;
      if (task.status !== 'error') return false;
      task.status = 'idle';
      task.transferred = 0;
      task.error = null;
      refresh();
      startNext();
      return true;
    },

    remove: (id) => {
      if (running.has(id)) return false; // cancel first
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;
      tasks.splice(index, 1);
      refresh();
      return true;
    },
  };

  const core: UseUploadReturn = {
    get state(): UploadState {
      return state;
    },
    actions,
    subscribe: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  return core;
}
