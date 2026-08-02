/**
 * Headless upload — core behavior, bridge contract, dual-adapter test.
 * ADR 0034 wedge 5. All tests run in Node with zero DOM and zero timers;
 * transfers are driven through a manually-settled fake transport, so every
 * lifecycle transition is deterministic.
 */
import { describe, expect, test } from 'vitest';
import type {
  UploadCallbacks,
  UploadHandle,
  UploadItem,
  UploadTransport,
} from '../../src/upload/core/types.js';
import { createUploadCore } from '../../src/upload/index.js';
import { createUploadStore } from '../../src/upload/svelte/index.js';
import { createVanillaUpload } from '../../src/upload/vanilla/index.js';
import { useUpload } from '../../src/upload/react/index.js';

interface FakeTransfer {
  item: UploadItem;
  promise: Promise<void>;
  resolve: () => void;
  reject: (err: unknown) => void;
  cancelled: boolean;
  progressCalls: number[];
  processingCalled: boolean;
  /** Test helper: fire onProgress. */
  progress(bytes: number): void;
  /** Test helper: fire onProcessing. */
  processing(): void;
}

/** Transport whose transfers the test settles by hand. */
function fakeTransport() {
  const transfers: FakeTransfer[] = [];
  const transport: UploadTransport = {
    upload(item: UploadItem, callbacks: UploadCallbacks): UploadHandle {
      let cancelled = false;
      let resolveTransfer: () => void = () => {};
      let rejectTransfer: (err: unknown) => void = () => {};
      const promise = new Promise<void>((res, rej) => {
        resolveTransfer = () => {
          if (!cancelled) res();
        };
        rejectTransfer = (err: unknown) => rej(err);
      });
      const transfer: FakeTransfer = {
        item,
        promise,
        resolve: () => resolveTransfer(),
        reject: (err) => rejectTransfer(err),
        cancelled: false,
        progressCalls: [],
        processingCalled: false,
        progress(bytes: number) {
          callbacks.onProgress(bytes);
          transfer.progressCalls.push(bytes);
        },
        processing() {
          callbacks.onProcessing();
          transfer.processingCalled = true;
        },
      };
      transfers.push(transfer);
      return {
        promise,
        cancel() {
          cancelled = true;
          transfer.cancelled = true;
          rejectTransfer(new Error('Aborted'));
        },
      };
    },
  };
  return { transport, transfers };
}

const FILE = { id: 'a1', name: 'photo.png', size: 100, type: 'image/png' };

// ---------------------------------------------------------------------------
// Core state machine
// ---------------------------------------------------------------------------

describe('createUploadCore', () => {
  test('initial state derives defaults', () => {
    const upload = createUploadCore({ transport: fakeTransport().transport });
    expect(upload.state.tasks).toEqual([]);
    expect(upload.state.uploading).toBe(false);
    expect(upload.state.progress).toBe(0);
    expect(upload.state.doneCount).toBe(0);
    expect(upload.state.errorCount).toBe(0);
  });

  test('add enqueues and immediately starts the transfer', () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add(FILE);
    expect(upload.state.tasks).toHaveLength(1);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]!.item).toMatchObject({
      id: 'a1',
      name: 'photo.png',
      size: 100,
      type: 'image/png',
    });
    const task = upload.state.tasks[0]!;
    expect(task.status).toBe('uploading');
    expect(task.busy).toBe(true);
    expect(task.canCancel).toBe(true);
    expect(task.progress).toBe(0);
    expect(upload.state.uploading).toBe(true);
  });

  test('add accepts an array and starts per concurrency', () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add([
      { ...FILE, id: 'a1' },
      { ...FILE, id: 'a2' },
      { ...FILE, id: 'a3' },
    ]);
    expect(transfers).toHaveLength(3); // default maxConcurrent 3
    expect(upload.state.tasks.filter((t) => t.status === 'idle')).toHaveLength(0);
  });

  test('onProgress updates transferred and derives progress, clamped to size', () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add(FILE);
    const handle = transfers[0]!;
    handle.progress(25);
    expect(upload.state.tasks[0]!.transferred).toBe(25);
    expect(upload.state.tasks[0]!.progress).toBeCloseTo(0.25);
    handle.progress(999); // clamp
    expect(upload.state.tasks[0]!.transferred).toBe(100);
    expect(upload.state.tasks[0]!.progress).toBe(1);
  });

  test('resolve moves uploading → done and frees the slot for the next item', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport, maxConcurrent: 1 });
    upload.actions.add([
      { ...FILE, id: 'a1' },
      { ...FILE, id: 'a2' },
    ]);
    expect(transfers).toHaveLength(1);
    expect(upload.state.tasks[0]!.status).toBe('uploading');
    expect(upload.state.tasks[1]!.status).toBe('idle');

    transfers[0]!.resolve();
    await transfers[0]!.promise;
    const task = upload.state.tasks[0]!;
    expect(task.status).toBe('done');
    expect(task.transferred).toBe(100);
    expect(task.progress).toBe(1);
    expect(task.busy).toBe(false);
    expect(task.canCancel).toBe(false);
    expect(upload.state.doneCount).toBe(1);

    // Slot freed: a2 started automatically, in order.
    expect(transfers).toHaveLength(2);
    expect(transfers[1]!.item.id).toBe('a2');
    expect(upload.state.tasks[1]!.status).toBe('uploading');
  });

  test('onProcessing holds the slot until resolve', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport, maxConcurrent: 1 });
    upload.actions.add([
      { ...FILE, id: 'a1' },
      { ...FILE, id: 'a2' },
    ]);
    const first = transfers[0]!;
    first.progress(100);
    first.processing();
    expect(upload.state.tasks[0]!.status).toBe('processing');
    expect(upload.state.tasks[0]!.busy).toBe(true);
    expect(upload.state.tasks[0]!.canCancel).toBe(false);
    expect(transfers).toHaveLength(1); // slot still held

    first.resolve();
    await first.promise;
    expect(upload.state.tasks[0]!.status).toBe('done');
    expect(transfers).toHaveLength(2); // now the slot frees
  });

  test('reject moves uploading → error with message; slot freed', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport, maxConcurrent: 1 });
    upload.actions.add([
      { ...FILE, id: 'a1' },
      { ...FILE, id: 'a2' },
    ]);
    transfers[0]!.reject(new Error('network down'));
    await transfers[0]!.promise.catch(() => {});
    const task = upload.state.tasks[0]!;
    expect(task.status).toBe('error');
    expect(task.error).toBe('network down');
    expect(task.canRetry).toBe(true);
    expect(task.busy).toBe(false);
    expect(upload.state.errorCount).toBe(1);
    expect(transfers[1]!.item.id).toBe('a2'); // slot freed
  });

  test('retry re-queues a failed task and resets state', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add(FILE);
    transfers[0]!.reject('too big');
    await transfers[0]!.promise.catch(() => {});
    expect(upload.actions.retry('a1')).toBe(true);
    const task = upload.state.tasks[0]!;
    expect(task.status).toBe('uploading');
    expect(task.transferred).toBe(0);
    expect(task.error).toBeNull();
    expect(task.canRetry).toBe(false);
    expect(transfers).toHaveLength(2);
    expect(transfers[1]!.item.id).toBe('a1');
    // Failure message survives as string too.
    expect(upload.actions.retry('missing')).toBe(false);
  });

  test('retry rejects non-error tasks', () => {
    const { transport } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add(FILE);
    expect(upload.actions.retry('a1')).toBe(false); // uploading
  });

  test('cancel aborts the transport, removes the task, ignores late settle', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add(FILE);
    expect(upload.actions.cancel('a1')).toBe(true);
    expect(upload.state.tasks).toHaveLength(0);
    expect(transfers[0]!.cancelled).toBe(true);
    // Late reject (or resolve) after cancel must not resurrect the task.
    transfers[0]!.reject('late failure');
    await transfers[0]!.promise.catch(() => {});
    expect(upload.state.tasks).toHaveLength(0);
    expect(upload.state.errorCount).toBe(0);
    expect(upload.actions.cancel('a1')).toBe(false);
  });

  test('maxConcurrent limits in-flight transfers, FIFO order preserved', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport, maxConcurrent: 2 });
    upload.actions.add([
      { ...FILE, id: 'a1' },
      { ...FILE, id: 'a2' },
      { ...FILE, id: 'a3' },
      { ...FILE, id: 'a4' },
    ]);
    expect(transfers).toHaveLength(2);
    expect(upload.state.tasks.map((t) => t.status)).toEqual([
      'uploading',
      'uploading',
      'idle',
      'idle',
    ]);

    transfers[0]!.resolve();
    await transfers[0]!.promise;
    expect(transfers).toHaveLength(3);
    expect(transfers[2]!.item.id).toBe('a3');

    transfers[1]!.resolve();
    await transfers[1]!.promise;
    expect(transfers).toHaveLength(4);
    expect(transfers[3]!.item.id).toBe('a4');
    transfers[2]!.resolve();
    await transfers[2]!.promise;
    transfers[3]!.resolve();
    await transfers[3]!.promise;
    expect(upload.state.tasks.every((t) => t.status === 'done')).toBe(true);
    expect(upload.state.uploading).toBe(false);
  });

  test('maxConcurrent <= 0 starts everything', () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport, maxConcurrent: 0 });
    upload.actions.add([
      { ...FILE, id: 'a1' },
      { ...FILE, id: 'a2' },
      { ...FILE, id: 'a3' },
      { ...FILE, id: 'a4' },
    ]);
    expect(transfers).toHaveLength(4);
  });

  test('idempotent add skips duplicates by key while active', () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add({ ...FILE, key: 'k1' });
    upload.actions.add({ ...FILE, key: 'k1' });
    upload.actions.add({ ...FILE, key: 'k1' });
    expect(upload.state.tasks).toHaveLength(1);
    expect(transfers).toHaveLength(1);
  });

  test('key dedupe lifts once the earlier task finishes', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add({ ...FILE, key: 'k1' });
    transfers[0]!.resolve();
    await transfers[0]!.promise;
    upload.actions.add({ ...FILE, id: 'a2', key: 'k1' });
    expect(upload.state.tasks).toHaveLength(2);
  });

  test('key dedupe lifts on error (retry is the recovery path)', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add({ ...FILE, key: 'k1' });
    transfers[0]!.reject('nope');
    await transfers[0]!.promise.catch(() => {});
    upload.actions.add({ ...FILE, id: 'a2', key: 'k1' });
    expect(upload.state.tasks).toHaveLength(2);
  });

  test('same id is never added twice', () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add(FILE);
    upload.actions.add(FILE);
    expect(upload.state.tasks).toHaveLength(1);
    expect(transfers).toHaveLength(1);
  });

  test('remove drops non-transferring tasks only', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport, maxConcurrent: 1 });
    upload.actions.add([
      { ...FILE, id: 'a1' },
      { ...FILE, id: 'a2' },
    ]);
    expect(upload.actions.remove('a1')).toBe(false); // uploading → cancel first
    expect(upload.actions.remove('a2')).toBe(true); // queued
    expect(upload.state.tasks.map((t) => t.id)).toEqual(['a1']);

    transfers[0]!.resolve();
    await transfers[0]!.promise;
    expect(upload.actions.remove('a1')).toBe(true); // done
    expect(upload.state.tasks).toHaveLength(0);
    expect(upload.actions.remove('ghost')).toBe(false);
  });

  test('aggregate progress weighs all tasks by size', () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add({ ...FILE, id: 'big', size: 200 });
    upload.actions.add({ ...FILE, id: 'small', size: 50 });
    transfers[0]!.progress(100); // big: 50%
    expect(upload.state.progress).toBeCloseTo(100 / 250);
    transfers[1]!.progress(25); // small: 50%
    expect(upload.state.progress).toBeCloseTo(125 / 250);
    expect(upload.state.progress).toBeCloseTo(0.5);
  });

  test('size 0 tasks report 0 until done, then 1', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add({ ...FILE, id: 'empty', size: 0 });
    expect(upload.state.tasks[0]!.progress).toBe(0);
    transfers[0]!.resolve();
    await transfers[0]!.promise;
    expect(upload.state.tasks[0]!.progress).toBe(1);
  });

  test('transport receives key and data payloads', () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    const payload = { bytes: new Uint8Array([1, 2, 3]) };
    upload.actions.add({
      id: 'x',
      name: 'raw.bin',
      size: 3,
      key: 'dedupe-key',
      data: payload,
    });
    expect(transfers[0]!.item).toMatchObject({
      key: 'dedupe-key',
      data: payload,
    });
  });

  test('subscribe notifies per mutation and unsubscribes', async () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    let calls = 0;
    const unsubscribe = upload.subscribe(() => calls++);
    upload.actions.add(FILE); // add + start
    transfers[0]!.progress(50);
    transfers[0]!.resolve();
    await transfers[0]!.promise;
    expect(calls).toBeGreaterThanOrEqual(4);
    unsubscribe();
    upload.actions.add({ ...FILE, id: 'a2' });
    expect(upload.state.tasks).toHaveLength(2);
  });

  test('no-op actions do not notify', () => {
    const { transport } = fakeTransport();
    const upload = createUploadCore({ transport });
    let calls = 0;
    upload.subscribe(() => calls++);
    upload.actions.add(FILE); // 1 (add) + 1 (start)
    upload.actions.add(FILE); // duplicate id — skipped
    upload.actions.remove('ghost');
    upload.actions.cancel('ghost');
    expect(calls).toBe(2);
  });

  test('state is pure JSON — no functions leak', () => {
    const { transport, transfers } = fakeTransport();
    const upload = createUploadCore({ transport });
    upload.actions.add(FILE);
    transfers[0]!.progress(50);
    const serialized = JSON.parse(JSON.stringify(upload.state));
    expect(serialized.tasks).toHaveLength(1);
    expect(serialized.tasks[0]).toMatchObject({
      id: 'a1',
      name: 'photo.png',
      size: 100,
      status: 'uploading',
      transferred: 50,
      progress: 0.5,
      busy: true,
      canCancel: true,
      canRetry: false,
    });
    expect(serialized.uploading).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bridge contract + dual adapter (ADR 0034 §2/§3)
// ---------------------------------------------------------------------------

describe('upload adapters', () => {
  test('svelte + vanilla mounted on one shared core agree', async () => {
    const { transport, transfers } = fakeTransport();
    const core = createUploadCore({ transport });
    const store = createUploadStore(core);
    const vanilla = createVanillaUpload(core);
    const progressSeen: number[] = [];
    const busySeen: boolean[] = [];
    const unsubProgress = store.progress.subscribe((p) => progressSeen.push(p));
    const unsubBusy = vanilla.subscribe(() => busySeen.push(vanilla.state.uploading));
    expect(progressSeen).toEqual([0]);
    expect(store.core).toBe(core);
    expect(vanilla).toBe(core);

    store.actions.add(FILE);
    transfers[0]!.progress(50);
    transfers[0]!.resolve();
    await transfers[0]!.promise;

    expect(progressSeen[progressSeen.length - 1]).toBe(1);
    expect(store.state.subscribe).toBeTypeOf('function');
    expect(store.tasks.subscribe).toBeTypeOf('function');
    expect(store.uploading.subscribe).toBeTypeOf('function');
    expect(vanilla.state.doneCount).toBe(1);
    expect(vanilla.state.uploading).toBe(false);
    expect(busySeen.includes(true)).toBe(true);

    unsubProgress();
    unsubBusy();
  });

  test('react useUpload is a function', () => {
    expect(typeof useUpload).toBe('function');
  });

  test('svelte createUploadStore returns the documented surface', () => {
    const store = createUploadStore({ transport: fakeTransport().transport });
    expect(typeof store.actions.add).toBe('function');
    expect(typeof store.actions.cancel).toBe('function');
    expect(typeof store.actions.retry).toBe('function');
    expect(typeof store.actions.remove).toBe('function');
    expect(typeof store.state.subscribe).toBe('function');
    expect(typeof store.tasks.subscribe).toBe('function');
    expect(typeof store.progress.subscribe).toBe('function');
    expect(typeof store.uploading.subscribe).toBe('function');
  });

  test('vanilla returns the core itself for shared mounts', () => {
    const { transport } = fakeTransport();
    const core = createUploadCore({ transport });
    expect(createVanillaUpload(core)).toBe(core);
    const fresh = createVanillaUpload({ transport, maxConcurrent: 1 });
    expect(fresh).not.toBe(core);
    expect(fresh.state.tasks).toEqual([]);
  });
});
