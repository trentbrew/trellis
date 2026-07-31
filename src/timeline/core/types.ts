/**
 * Timeline core types — the playhead-engine contract (ADR 0034 §6, wedge 3).
 *
 * @module trellis/timeline
 */

export interface TimelineMark {
  /** Stable id; also the selection key. */
  id: string;
  /** Seconds from the start of the timeline. */
  time: number;
  /** For range marks, the end time; point marks omit it. */
  end?: number;
  label?: string;
  /** Data hint only — renderers map it to their own palette. */
  color?: string;
  /** Arbitrary payload (op hash, entity id, …). */
  data?: unknown;
}

export interface TimelineRange {
  start: number;
  end: number;
  label?: string;
  data?: unknown;
}

export interface TimelineState {
  /** Total timeline length in seconds (0 = no timeline yet). */
  duration: number;
  /** Current playhead position, always within [0, duration]. */
  position: number;
  /** Playback multiplier; 0 = paused, negative = reverse. */
  rate: number;
  /** Derived: rate !== 0. */
  playing: boolean;
  /** Wrap at range/duration edges when true; otherwise auto-pause. */
  loop: boolean;
  /** Loop/scrub window; null = whole timeline. */
  range: TimelineRange | null;
  marks: TimelineMark[];
  /** Selected mark id (may reference a removed mark → `selectedMark` null). */
  selectedMarkId: string | null;
  /** Derived: the selected mark, or null. */
  selectedMark: TimelineMark | null;
  /** Ticker granularity hint for adapters (seconds per tick at rate 1). */
  step: number;
  /** Derived: position / duration (0 when duration is 0). */
  progress: number;
  /** Derived: position at the lower edge (range.start ?? 0). */
  atStart: boolean;
  /** Derived: position at the upper edge (range.end ?? duration). */
  atEnd: boolean;
}

export interface TimelineActions {
  play(): void;
  pause(): void;
  togglePlay(): void;
  /** Any rate; 0 pauses, negative reverses. */
  setRate(rate: number): void;
  /** Jump the playhead; clamped to the active window. */
  seek(position: number): void;
  /**
   * Advance by real time; the core applies `rate` and edge policy
   * (wrap when looping, auto-pause at the edges otherwise).
   */
  step(deltaSeconds: number): void;
  setDuration(duration: number): void;
  setLoop(loop: boolean): void;
  /** Constrain the playhead to [start, end]; clears when end <= start. */
  setRange(start: number, end: number): void;
  clearRange(): void;
  setMarks(marks: TimelineMark[]): void;
  selectMark(id: string | null): void;
  setStep(step: number): void;
}

export interface TimelineConfig {
  duration?: number;
  position?: number;
  rate?: number;
  loop?: boolean;
  range?: TimelineRange | null;
  marks?: TimelineMark[];
  step?: number;
}

export interface UseTimelineReturn {
  readonly state: TimelineState;
  readonly actions: TimelineActions;
  subscribe(listener: () => void): () => void;
}
