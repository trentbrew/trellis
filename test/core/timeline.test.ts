/**
 * Headless timeline — core behavior, bridge contract, dual-adapter test.
 * ADR 0034 wedge 3. All tests run in Node with zero DOM and zero timers.
 */
import { describe, expect, test } from 'vitest';
import {
  createTimelineCore,
  type TimelineMark,
} from '../../src/timeline/index.js';
import { createTimelineStore } from '../../src/timeline/svelte/index.js';
import { createVanillaTimeline } from '../../src/timeline/vanilla/index.js';
import { useTimeline } from '../../src/timeline/react/index.js';

const MARKS: TimelineMark[] = [
  { id: 'm1', time: 10, label: 'Start of phase A', color: 'blue' },
  { id: 'm2', time: 45, end: 55, label: 'Phase B window', color: 'amber' },
  { id: 'm3', time: 80, label: 'Phase C', data: { op: 'op-123' } },
];

// ---------------------------------------------------------------------------
// Core state machine
// ---------------------------------------------------------------------------

describe('createTimelineCore', () => {
  test('initial state derives defaults', () => {
    const timeline = createTimelineCore({ duration: 90, marks: MARKS });
    expect(timeline.state.position).toBe(0);
    expect(timeline.state.rate).toBe(0);
    expect(timeline.state.playing).toBe(false);
    expect(timeline.state.loop).toBe(true);
    expect(timeline.state.progress).toBe(0);
    expect(timeline.state.atStart).toBe(true);
    expect(timeline.state.atEnd).toBe(false);
    expect(timeline.state.marks).toHaveLength(3);
    expect(timeline.state.selectedMark).toBeNull();
    expect(timeline.state.step).toBeCloseTo(1 / 60);
  });

  test('seek clamps to duration', () => {
    const timeline = createTimelineCore({ duration: 90 });
    timeline.actions.seek(120);
    expect(timeline.state.position).toBe(90);
    expect(timeline.state.atEnd).toBe(true);
    timeline.actions.seek(-5);
    expect(timeline.state.position).toBe(0);
    expect(timeline.state.atStart).toBe(true);
  });

  test('step advances by delta * rate; paused stays still', () => {
    const timeline = createTimelineCore({ duration: 90 });
    timeline.actions.play();
    timeline.actions.step(2);
    expect(timeline.state.position).toBe(2);
    expect(timeline.state.playing).toBe(true);
    timeline.actions.pause();
    timeline.actions.step(2);
    expect(timeline.state.position).toBe(2);
  });

  test('reverse playback moves backward and auto-pauses at the start', () => {
    const timeline = createTimelineCore({ duration: 90, position: 10, loop: false });
    timeline.actions.setRate(-2);
    timeline.actions.step(3);
    expect(timeline.state.position).toBe(4);
    timeline.actions.step(10);
    expect(timeline.state.position).toBe(0);
    expect(timeline.state.rate).toBe(0);
    expect(timeline.state.atStart).toBe(true);
  });

  test('loop wraps past the end (and under the start in reverse)', () => {
    const timeline = createTimelineCore({ duration: 10, loop: true });
    timeline.actions.seek(9);
    timeline.actions.setRate(1);
    timeline.actions.step(3);
    expect(timeline.state.position).toBeCloseTo(2);
    expect(timeline.state.playing).toBe(true);

    timeline.actions.setRate(-1);
    timeline.actions.step(3);
    expect(timeline.state.position).toBeCloseTo(9);
  });

  test('no loop: auto-pause exactly at the end', () => {
    const timeline = createTimelineCore({ duration: 10, loop: false });
    timeline.actions.setRate(1);
    timeline.actions.step(12);
    expect(timeline.state.position).toBe(10);
    expect(timeline.state.rate).toBe(0);
    expect(timeline.state.atEnd).toBe(true);
  });

  test('setRange constrains movement and derived edges', () => {
    const timeline = createTimelineCore({ duration: 100, loop: false });
    timeline.actions.setRange(20, 40);
    timeline.actions.seek(50);
    expect(timeline.state.position).toBe(40);
    expect(timeline.state.atEnd).toBe(true);
    timeline.actions.seek(0);
    expect(timeline.state.position).toBe(20);
    expect(timeline.state.atStart).toBe(true);
    // progress still relative to full duration
    timeline.actions.seek(30);
    expect(timeline.state.progress).toBeCloseTo(0.3);
  });

  test('setRange with end <= start clears the range', () => {
    const timeline = createTimelineCore({ duration: 100 });
    timeline.actions.setRange(50, 40);
    expect(timeline.state.range).toBeNull();
  });

  test('range wrap keeps the playhead inside the window', () => {
    const timeline = createTimelineCore({ duration: 100, loop: true });
    timeline.actions.setRange(10, 20);
    timeline.actions.seek(19);
    timeline.actions.setRate(1);
    timeline.actions.step(3);
    expect(timeline.state.position).toBeGreaterThanOrEqual(10);
    expect(timeline.state.position).toBeLessThanOrEqual(20);
  });

  test('marks: set, select, and selectedMark survives removal as null', () => {
    const timeline = createTimelineCore({ marks: MARKS });
    timeline.actions.selectMark('m2');
    expect(timeline.state.selectedMarkId).toBe('m2');
    expect(timeline.state.selectedMark?.label).toBe('Phase B window');
    expect(timeline.state.selectedMark?.end).toBe(55);
    timeline.actions.setMarks([MARKS[0]!]);
    expect(timeline.state.selectedMark).toBeNull();
    expect(timeline.state.selectedMarkId).toBe('m2');
  });

  test('duration 0: everything clamps to zero, progress 0', () => {
    const timeline = createTimelineCore();
    timeline.actions.seek(50);
    expect(timeline.state.position).toBe(0);
    expect(timeline.state.progress).toBe(0);
    timeline.actions.setRate(1);
    timeline.actions.step(10);
    expect(timeline.state.position).toBe(0);
  });

  test('subscribe notifies per mutation and unsubscribes', () => {
    const timeline = createTimelineCore({ duration: 10 });
    let calls = 0;
    const unsubscribe = timeline.subscribe(() => calls++);
    timeline.actions.play();
    timeline.actions.seek(3);
    timeline.actions.pause();
    expect(calls).toBe(3);
    unsubscribe();
    timeline.actions.seek(4);
    expect(calls).toBe(3);
  });

  test('no-op actions do not notify', () => {
    const timeline = createTimelineCore({ duration: 10 });
    let calls = 0;
    timeline.subscribe(() => calls++);
    timeline.actions.pause(); // already paused
    timeline.actions.setLoop(true); // already true
    expect(calls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Bridge contract + dual adapter (ADR 0034 §2/§3)
// ---------------------------------------------------------------------------

describe('timeline adapters', () => {
  test('svelte + vanilla mounted on one shared core agree', () => {
    const core = createTimelineCore({ duration: 90, marks: MARKS });
    const store = createTimelineStore(core);
    const vanilla = createVanillaTimeline(core);
    const positions: number[] = [];
    const vanillaPositions: number[] = [];
    const unsubPos = store.position.subscribe((p) => positions.push(p));
    const unsubVanilla = vanilla.subscribe(() =>
      vanillaPositions.push(vanilla.state.position),
    );
    expect(positions).toEqual([0]);
    expect(store.core).toBe(core);
    expect(vanilla).toBe(core);

    store.actions.play();
    store.actions.step(5);
    expect(store.position.subscribe).toBeTypeOf('function');
    expect(positions).toEqual([0, 0, 5]);
    expect(vanillaPositions).toEqual([0, 5]);
    expect(vanilla.state.playing).toBe(true);
    expect(store.core.state.position).toBe(5);
    expect(vanilla.state.marks).toHaveLength(3);

    store.actions.pause();
    unsubPos();
    unsubVanilla();
  });

  test('react useTimeline is a function', () => {
    expect(typeof useTimeline).toBe('function');
  });

  test('svelte createTimelineStore returns the documented surface', () => {
    const store = createTimelineStore({ duration: 10 });
    expect(typeof store.actions.play).toBe('function');
    expect(typeof store.actions.step).toBe('function');
    expect(typeof store.state.subscribe).toBe('function');
    expect(typeof store.position.subscribe).toBe('function');
    expect(typeof store.marks.subscribe).toBe('function');
  });

  test('marks stay pure JSON', () => {
    const timeline = createTimelineCore({ marks: MARKS });
    const serialized = JSON.parse(JSON.stringify(timeline.state.marks));
    expect(serialized).toEqual([
      { id: 'm1', time: 10, label: 'Start of phase A', color: 'blue' },
      { id: 'm2', time: 45, end: 55, label: 'Phase B window', color: 'amber' },
      { id: 'm3', time: 80, label: 'Phase C', data: { op: 'op-123' } },
    ]);
  });
});
