/**
 * Colorpicker core — color-pick state machine (ADR 0034 wedge 9).
 *
 * Framework-free, DOM-free, timer-free: parsing, formatting, and WCAG
 * contrast are pure math (`./color.ts`); the picker UI (canvas/sliders/
 * grid) is the visual runtime. The rare pure-build wedge — no Tier-1
 * headless exists for color picking, and this core needs no adoptions.
 *
 *   const picker = createColorPickerCore({ initial: '#3366ff' });
 *   picker.actions.open();
 *   picker.actions.setDraft('#ff8800');
 *   picker.actions.commit();
 *
 * Consumers: forms color field (schema-derived control), timeline mark
 * colors, design tokens. Anatomy reference: ui-thing Color Picker.
 *
 * @module trellis/colorpicker
 */

import {
  BLACK,
  WHITE,
  contrastRatio,
  formatHex,
  formatHsl,
  formatRgb,
  parseColor,
  type Rgb,
} from './color.js';
import type {
  ColorContrast,
  ColorFormat,
  ColorPickerActions,
  ColorPickerConfig,
  ColorPickerState,
  UseColorPickerReturn,
} from './types.js';

export type {
  ColorContrast,
  ColorFormat,
  ColorPickerActions,
  ColorPickerConfig,
  ColorPickerState,
  UseColorPickerReturn,
} from './types.js';

function contrastFor(rgb: Rgb): ColorContrast {
  const white = contrastRatio(rgb, WHITE);
  const black = contrastRatio(rgb, BLACK);
  return {
    white,
    black,
    aaNormal: white >= 4.5 || black >= 4.5,
    aaLarge: white >= 3 || black >= 3,
    aaaNormal: white >= 7 || black >= 7,
  };
}

export function createColorPickerCore(
  config: ColorPickerConfig = {},
): UseColorPickerReturn {
  const maxRecent = config.maxRecent ?? 8;
  const initialRgb = parseColor(config.initial ?? '#000000') ?? { r: 0, g: 0, b: 0 };
  let format: ColorFormat = config.format ?? 'hex';

  const recent: string[] = [];
  let valueRgb: Rgb = initialRgb;
  let open = false;
  let draft = '';
  let draftValid = false;
  let draftRgb: Rgb | null = null;

  let state = deriveState();
  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  function stringify(rgb: Rgb, fmt: ColorFormat): string {
    if (fmt === 'rgb') return formatRgb(rgb);
    if (fmt === 'hsl') return formatHsl(rgb);
    return formatHex(rgb);
  }

  /** The color the UI should preview right now (draft wins while open). */
  function previewRgb(): Rgb | null {
    if (open && draftValid && draftRgb) return draftRgb;
    if (open) return null;
    return valueRgb;
  }

  function deriveState(): ColorPickerState {
    const preview = previewRgb();
    return {
      value: stringify(valueRgb, format),
      format,
      open,
      draft,
      valid: draftValid,
      normalized: preview ? formatHex(preview) : null,
      contrast: preview ? contrastFor(preview) : null,
      recent: [...recent],
    };
  }

  function pushRecent(rgb: Rgb): void {
    if (maxRecent <= 0) return;
    const hex = formatHex(rgb);
    const existing = recent.indexOf(hex);
    if (existing !== -1) recent.splice(existing, 1);
    recent.unshift(hex);
    if (recent.length > maxRecent) recent.length = maxRecent;
  }

  const actions: ColorPickerActions = {
    open: () => {
      if (open) return;
      open = true;
      draft = stringify(valueRgb, format);
      const parsed = parseColor(draft);
      draftValid = parsed !== null;
      draftRgb = parsed;
      state = deriveState();
      notify();
    },

    setDraft: (color) => {
      if (!open) return;
      if (color === draft && draftValid) return;
      draft = color;
      const parsed = parseColor(color);
      draftValid = parsed !== null;
      draftRgb = parsed;
      state = deriveState();
      notify();
    },

    commit: () => {
      if (!open || !draftValid || !draftRgb) return false;
      open = false;
      valueRgb = draftRgb;
      pushRecent(valueRgb);
      state = deriveState();
      notify();
      return true;
    },

    cancel: () => {
      if (!open) return;
      open = false;
      draft = stringify(valueRgb, format);
      draftValid = true;
      draftRgb = valueRgb;
      state = deriveState();
      notify();
    },

    setValue: (color) => {
      const parsed = parseColor(color);
      if (!parsed) return false;
      if (parsed.r === valueRgb.r && parsed.g === valueRgb.g && parsed.b === valueRgb.b) {
        return true;
      }
      valueRgb = parsed;
      if (open) {
        draft = stringify(valueRgb, format);
        draftValid = true;
        draftRgb = valueRgb;
      }
      pushRecent(valueRgb);
      state = deriveState();
      notify();
      return true;
    },

    setFormat: (fmt) => {
      if (fmt === format) return;
      format = fmt;
      if (open && draftValid && draftRgb) {
        draft = stringify(draftRgb, fmt);
      }
      state = deriveState();
      notify();
    },

    clearRecent: () => {
      if (recent.length === 0) return;
      recent.length = 0;
      state = deriveState();
      notify();
    },
  };

  const core: UseColorPickerReturn = {
    get state(): ColorPickerState {
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
