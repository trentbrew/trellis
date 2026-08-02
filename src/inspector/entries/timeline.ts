/**
 * Gallery entry — timeline (headless media timeline: playhead, rate,
 * looping, range marks, stepping — the rAF loop lives in adapters, not
 * the core, so time only advances here through actions).
 */

import { createTimelineCore } from '../../timeline/index.js';
import type { TimelineMark } from '../../timeline/core/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import { el } from '../dom.js';

const marks: TimelineMark[] = [
  { id: 'a', time: 1.5, label: 'beat 1', color: '#4ade80' },
  { id: 'b', time: 3, label: 'drop', color: '#fbbf24' },
  { id: 'c', time: 4.5, label: 'beat 2', color: '#4ade80' },
  { id: 'd', time: 6.75, label: 'end card', color: '#6ea8ff' },
];

export const timelineEntry: RegisteredComponent<{
  duration?: number;
  rate?: number;
  marks?: TimelineMark[];
}, ReturnType<typeof createTimelineCore>> = {
  type: 'timeline',
  name: 'Timeline',
  description:
    'Headless timeline — play/pause/seek/step, rate, duration, loop, range scrub, and labeled marks. No clock in the core: adapters drive it with rAF.',
  defaultConfig: { duration: 8, rate: 0, marks },
  create: (config) => createTimelineCore({ duration: config.duration, rate: config.rate, marks: config.marks }),
  actions: [
    { label: 'Play', enabled: (c) => c.state.rate === 0, run: (c) => c.actions.play() },
    { label: 'Pause', enabled: (c) => c.state.rate !== 0, run: (c) => c.actions.pause() },
    { label: 'Toggle', run: (c) => c.actions.togglePlay() },
    { label: 'Step +0.25', run: (c) => c.actions.step(0.25) },
    { label: 'Seek 3', run: (c) => c.actions.seek(3) },
    { label: 'Rate 2×', run: (c) => c.actions.setRate(2) },
    { label: 'Rate 0.5×', run: (c) => c.actions.setRate(0.5) },
    { label: 'Loop toggle', run: (c) => c.actions.setLoop(!c.state.loop) },
    { label: 'Range 2–6', run: (c) => c.actions.setRange(2, 6) },
    { label: 'Clear range', run: (c) => c.actions.clearRange() },
    { label: 'Duration 12', run: (c) => c.actions.setDuration(12) },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        const bar = el('div', { class: 'timeline-bar' });
        const fill = el('div', { class: 'timeline-fill' });
        const playhead = el('div', { class: 'timeline-playhead' });
        const marksHost = el('div', { class: 'timeline-marks' });
        const status = el('div', { class: 'status-line' });

        const render = () => {
          const s = core.state as {
            position: number;
            duration: number;
            playing: boolean;
            rate: number;
            loop: boolean;
            range: { start: number; end: number } | null;
            marks: TimelineMark[];
          };
          const pct = s.duration ? Math.min(100, (s.position / s.duration) * 100) : 0;
          fill.style.width = `${pct}%`;
          playhead.style.left = `${pct}%`;
          marksHost.replaceChildren();
          for (const m of s.marks) {
            const dot = el('div', { class: 'timeline-mark', style: `left:${(m.time / s.duration) * 100}%` });
            if (m.color) dot.style.background = m.color;
            dot.title = m.label ?? m.id;
            marksHost.append(dot);
          }
          const rangePct = s.range ? `${(s.range.start / s.duration) * 100}%` : null;
          bar.style.boxShadow = s.range && rangePct ? `inset ${rangePct} 0 0 0 var(--amber)` : '';
          status.textContent =
            `pos: ${s.position.toFixed(2)}s / ${s.duration}s · ${s.playing ? '▶' : '⏸'} · rate ${s.rate}×` +
            ` · loop ${s.loop} · ` + (s.range ? `range ${s.range.start}–${s.range.end}` : 'no range');
        };

        const unsub = core.subscribe(render);
        render();
        host.append(el('div', { class: 'timeline' }, bar, marksHost, playhead), status);
        return unsub;
      },
    },
  ],
};
