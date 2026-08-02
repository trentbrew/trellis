/**
 * Colorpicker core types — the color-pick state machine contract
 * (ADR 0034 §6, wedge 9).
 *
 * Draft/commit (pick in a dialog → commit on close, the dialog resolver
 * pattern), format persistence, a recent-swatch ring, and contrast
 * computation as core data (WCAG text-on-color — the a11y-as-core-data
 * pattern). The DOM (canvas/sliders/grid) is the visual runtime; this core
 * owns nothing but state and math.
 *
 * @module trellis/colorpicker
 */

export type ColorFormat = 'hex' | 'rgb' | 'hsl';

export interface ColorContrast {
  /** WCAG ratio against white. */
  white: number;
  /** WCAG ratio against black. */
  black: number;
  /** Derived: meets AA for normal text (>= 4.5). */
  aaNormal: boolean;
  /** Derived: meets AA for large text (>= 3). */
  aaLarge: boolean;
  /** Derived: meets AAA for normal text (>= 7). */
  aaaNormal: boolean;
}

export interface ColorPickerState {
  /** Committed color, normalized to `format`. */
  value: string;
  /** Persisted display format (survives commit/cancel). */
  format: ColorFormat;
  /** Picker dialog open. */
  open: boolean;
  /** In-progress draft while open. */
  draft: string;
  /** Derived: the draft parses. */
  valid: boolean;
  /** Derived: canonical hex of the previewed color, or null when invalid. */
  normalized: string | null;
  /**
   * Derived: WCAG contrast of the previewed color (draft while open and
   * valid, else committed value) — a11y data as core data.
   */
  contrast: ColorContrast | null;
  /** Recent-swatch ring, most recent first, deduped, bounded. */
  recent: string[];
}

export interface ColorPickerConfig {
  /** Committed value at creation. Default `#000000`. */
  initial?: string;
  /** Initial display format. Default `hex`. */
  format?: ColorFormat;
  /** Max recent swatches kept. Default 8; `<= 0` disables the ring. */
  maxRecent?: number;
}

export interface ColorPickerActions {
  /** Open the picker; the draft starts from the committed value. */
  open(): void;
  /** Type/pick into the draft; the core parses and derives validity. */
  setDraft(color: string): void;
  /**
   * Commit the draft (dialog resolver pattern): closes the picker and
   * pushes the swatch. Returns false when the draft is invalid (the
   * picker stays open).
   */
  commit(): boolean;
  /** Close the picker, discarding the draft. */
  cancel(): void;
  /** Set the committed value directly (swatch click, external input). */
  setValue(color: string): boolean;
  /** Persist the display format; re-renders the committed value. */
  setFormat(format: ColorFormat): void;
  /** Clear the recent-swatch ring. */
  clearRecent(): void;
}

export interface UseColorPickerReturn {
  readonly state: ColorPickerState;
  readonly actions: ColorPickerActions;
  subscribe(listener: () => void): () => void;
}
