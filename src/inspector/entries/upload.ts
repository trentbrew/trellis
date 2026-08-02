/**
 * Gallery entry — upload (headless upload queue: concurrency, progress,
 * dedupe by key, cancel/retry/remove; the transport is the only I/O).
 */

import { createUploadCore } from '../../upload/index.js';
import type {
  RegisteredComponent,
} from '../../inspector/index.js';
import type { UploadCallbacks, UploadItem, UploadTransport } from '../../upload/index.js';
import { el } from '../dom.js';

const FILES = [
  { name: 'launch-recap.mov', size: 142_000_000, type: 'video/quicktime' },
  { name: 'oplog-compaction.pdf', size: 3_400_000, type: 'application/pdf' },
  { name: 'studio-session.tar.gz', size: 58_000_000, type: 'application/gzip' },
  { name: 'adr-0034-wedge-6.md', size: 24_000, type: 'text/markdown' },
];

const transport: UploadTransport = {
  upload(item: UploadItem, callbacks: UploadCallbacks) {
    let timer = 0;
    let cancelled = false;
    const promise = new Promise<void>((resolve, reject) => {
      const steps = 6 + Math.floor(Math.random() * 8);
      let step = 0;
      const tick = () => {
        if (cancelled) {
          reject(new Error('cancelled'));
          return;
        }
        step += 1;
        const transferred = Math.round((item.size * step) / steps);
        callbacks.onProgress(Math.min(transferred, item.size));
        if (step >= steps) {
          if (item.type === 'video/quicktime') {
            callbacks.onProcessing();
            window.setTimeout(() => resolve(), 600);
          } else {
            resolve();
          }
          return;
        }
        timer = window.setTimeout(tick, 90 + Math.random() * 160);
      };
      timer = window.setTimeout(tick, 60);
    });
    return {
      promise,
      cancel() {
        cancelled = true;
      },
    };
  },
};

type UploadConfig = { transport: typeof transport };

export const uploadEntry: RegisteredComponent<UploadConfig, ReturnType<typeof createUploadCore>> = {
  type: 'upload',
  name: 'Upload',
  description:
    'Headless upload queue — max concurrency, per-task progress, key dedupe (items sharing a key collapse), cancel/retry/remove. The fake transport simulates a server.',
  defaultConfig: { transport },
  create: (config) =>
    createUploadCore({ maxConcurrent: 2, transport: config.transport }),
  actions: [
    {
      label: 'Add 3 files',
      run: (c) => {
        const seq = (c.state as { tasks: unknown[] }).tasks.length;
        for (let i = 0; i < 3; i++) {
          const f = FILES[i % FILES.length]!;
          c.actions.add({
            id: `u${Date.now()}-${seq}-${i}`,
            key: `${f.name}#${seq % 3}`,
            name: `${seq + 1}.${i + 1} ${f.name}`,
            size: f.size,
            type: f.type,
          });
        }
      },
    },
    {
      label: 'Cancel first active',
      enabled: (c) => c.state.tasks.some((t: { status: string }) => t.status === 'uploading'),
      run: (c) => {
        const t = c.state.tasks.find((t: { status: string }) => t.status === 'uploading');
        if (t) c.actions.cancel((t as { id: string }).id);
      },
    },
    {
      label: 'Clear finished',
      enabled: (c) => c.state.doneCount + c.state.errorCount > 0,
      run: (c) => {
        for (const t of c.state.tasks) {
          if (t.status === 'done' || t.status === 'error') c.actions.remove((t as { id: string }).id);
        }
      },
    },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        const root = el('div', { class: 'upload-list' });
        const agg = el('div', { class: 'bar ok' });
        const aggFill = el('i', { style: 'width:0%' });
        const aggLabel = el('span', { class: 'status-line' });
        agg.append(aggFill);

        const render = () => {
          const s = core.state as {
            tasks: {
              id: string;
              name: string;
              size: number;
              status: string;
              progress: number;
              error?: string;
            }[];
            progress: number;
            doneCount: number;
            errorCount: number;
            uploading: boolean;
          };
          root.replaceChildren();
          for (const task of s.tasks) {
            const pct = Math.round(task.progress * 100);
            const row = el('div', { class: 'task' });
            row.append(
              el('span', { class: 'name', title: task.name }, task.name),
              el('span', { class: 'meta' }, `${(task.size / 1e6).toFixed(1)} MB`),
              el(
                'div',
                { class: `bar ${task.status === 'done' ? 'ok' : task.status === 'error' ? 'err' : ''}` },
                el('i', { style: `width:${pct}%` }),
              ),
              el('span', { class: `status status-${task.status}` }, task.status),
              el('span', {}, `${pct}%`),
            );
            if (task.status === 'uploading' || task.status === 'processing') {
              row.append(el('button', { class: 'mini', onclick: () => core.actions.cancel(task.id) }, 'cancel'));
            }
            if (task.status === 'error') {
              row.append(el('button', { class: 'mini', onclick: () => core.actions.retry(task.id) }, 'retry'));
              row.append(el('span', { style: 'color:var(--red);font-size:12px' }, task.error ?? ''));
            }
            if (task.status === 'done' || task.status === 'idle') {
              row.append(el('button', { class: 'mini', onclick: () => core.actions.remove(task.id) }, 'remove'));
            }
            root.append(row);
          }
          aggFill.style.width = `${Math.round(s.progress * 100)}%`;
          aggLabel.textContent =
            `${s.doneCount} done · ${s.errorCount} failed` +
            (s.uploading ? ` · ${Math.round(s.progress * 100)}%` : ' · idle');
        };

        const unsub = core.subscribe(render);
        render();
        host.append(root, el('div', { class: 'toolbar' }, agg, aggLabel));
        return unsub;
      },
    },
  ],
};
