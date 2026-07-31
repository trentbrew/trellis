/**
 * Timeline core — headless playhead engine (ADR 0034 wedge 3).
 *
 * Framework-free and DOM-free, and **timer-free**: time only advances via
 * explicit `step(deltaSeconds)` calls, so every behavior is deterministic
 * and testable in Node. Adapters (or app tickers) drive the clock.
 *
 *   const timeline = createTimelineCore({ duration: 90, marks });
 *   timeline.actions.play();
 *   // in a rAF / interval:
 *   timeline.actions.step(1 / 60);
 *
 * Shared by realtime-app and Raster.tv; feeds the DAG-scheduler
 * visualization.
 *
 * @module trellis/timeline
 */

import type {
  TimelineActions,
  TimelineConfig,
  TimelineMark,
  TimelineState,
  UseTimelineReturn,
} from './types.js';

export type {
  TimelineActions,
  TimelineConfig,
  TimelineMark,
  TimelineRange,
  TimelineState,
  UseTimelineReturn,
} from './types.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function lowerBound(state: Pick<TimelineState, 'range'>): number {
  return state.range?.start ?? 0;
}

function upperBound(state: Pick<TimelineState, 'duration' | 'range'>): number {
  return state.range?.end ?? state.duration;
}

export function createTimelineCore(
  config: TimelineConfig = {},
): UseTimelineReturn {
  const base: Omit<TimelineState, 'playing' | 'progress' | 'atStart' | 'atEnd' | 'selectedMark'> = {
    duration: config.duration ?? 0,
    position: 0,
    rate: config.rate ?? 0,
    loop: config.loop ?? true,
    range: config.range ?? null,
    marks: config.marks ?? [],
    selectedMarkId: null,
    step: config.step ?? 1 / 60,
  };
  const startPosition = clamp(
    config.position ?? 0,
    lowerBound(base),
    Math.max(upperBound(base), lowerBound(base)),
  );

  let state = deriveState({ ...base, position: startPosition });
  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  function deriveState(
    partial: Omit<TimelineState, 'playing' | 'progress' | 'atStart' | 'atEnd' | 'selectedMark'>,
  ): TimelineState {
    const lo = lowerBound(partial);
    const hi = Math.max(upperBound(partial), lo);
    const position = clamp(partial.position, lo, hi);
    const selectedMark =
      partial.marks.find((m) => m.id === partial.selectedMarkId) ?? null;
    return {
      ...partial,
      position,
      playing: partial.rate !== 0,
      progress: partial.duration > 0 ? position / partial.duration : 0,
      atStart: position <= lo,
      atEnd: position >= hi,
      selectedMark,
    };
  }

  const actions: TimelineActions = {
    play: () => {
      state = deriveState({ ...state, rate: state.rate === 0 ? 1 : state.rate });
      notify();
    },
    pause: () => {
      if (state.rate === 0) return;
      state = deriveState({ ...state, rate: 0 });
      notify();
    },
    togglePlay: () => {
      state = deriveState({ ...state, rate: state.rate === 0 ? 1 : 0 });
      notify();
    },
    setRate: (rate) => {
      if (rate === state.rate) return;
      state = deriveState({ ...state, rate });
      notify();
    },
    seek: (position) => {
      state = deriveState({ ...state, position });
      notify();
    },
    step: (deltaSeconds) => {
      if (state.rate === 0) return;
      const lo = lowerBound(state);
      const hi = upperBound(state);
      const raw = state.position + deltaSeconds * state.rate;
      let next = raw;
      let rate = state.rate;

      if (next > hi) {
        if (state.loop && hi > lo) {
          next = lo + ((next - hi) % Math.max(hi - lo, 1));
        } else {
          next = hi;
          rate = 0; // auto-pause at the end
        }
      } else if (next < lo) {
        if (state.loop && hi > lo) {
          next = hi - ((lo - next) % Math.max(hi - lo, 1));
        } else {
          next = lo;
          rate = 0; // auto-pause at the start
        }
      }

      state = deriveState({ ...state, position: next, rate });
      notify();
    },
    setDuration: (duration) => {
      const safe = Math.max(0, duration);
      if (safe === state.duration) return;
      state = deriveState({ ...state, duration: safe });
      notify();
    },
    setLoop: (loop) => {
      if (loop === state.loop) return;
      state = deriveState({ ...state, loop });
      notify();
    },
    setRange: (start, end) => {
      if (end <= start) {
        actions.clearRange();
        return;
      }
      state = deriveState({ ...state, range: { start, end } });
      notify();
    },
    clearRange: () => {
      if (!state.range) return;
      state = deriveState({ ...state, range: null });
      notify();
    },
    setMarks: (marks) => {
      state = deriveState({ ...state, marks });
      notify();
    },
    selectMark: (id) => {
      state = deriveState({ ...state, selectedMarkId: id });
      notify();
    },
    setStep: (step) => {
      state = deriveState({ ...state, step });
      notify();
    },
  };

  const core: UseTimelineReturn = {
    get state(): TimelineState {
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
