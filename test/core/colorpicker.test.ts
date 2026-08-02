/**
 * Headless colorpicker — color math + core behavior, bridge contract,
 * dual-adapter test. ADR 0034 wedge 9. All tests run in Node with zero DOM
 * and zero timers.
 *
 * Math assertions use known WCAG pairs: black/white = 21:1, red/white
 * ≈ 4:1, and Tailwind's documented AA-safe gray #767676.
 */
import { describe, expect, test } from 'vitest';
import {
  contrastRatio,
  formatHex,
  formatHsl,
  formatRgb,
  hslToRgb,
  luminance,
  parseColor,
  rgbToHsl,
} from '../../src/colorpicker/core/color.js';
import { createColorPickerCore } from '../../src/colorpicker/index.js';
import { createColorPickerStore } from '../../src/colorpicker/svelte/index.js';
import { createVanillaColorPicker } from '../../src/colorpicker/vanilla/index.js';
import { useColorPicker } from '../../src/colorpicker/react/index.js';

// ---------------------------------------------------------------------------
// Color math
// ---------------------------------------------------------------------------

describe('color math', () => {
  test('parseColor: hex short and long forms', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#3366ff')).toEqual({ r: 51, g: 102, b: 255 });
    expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('parseColor: rgb and hsl', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3 });
    expect(parseColor('rgb(255, 255, 255)')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0 });
    expect(parseColor('hsl(240, 100%, 50%)')).toEqual({ r: 0, g: 0, b: 255 });
  });

  test('parseColor: rejects garbage, out-of-range, and missing format', () => {
    for (const bad of [
      '',
      '  ',
      'red',
      '#zzz',
      '#ff00',
      '#ff00000',
      'rgb(300, 0, 0)',
      'rgb(-1, 0, 0)',
      'rgb(1, 2)',
      'hsl(0, 150%, 50%)',
      'hsl(0, 50%, 50',
      'rgba(0, 0, 0, 0.5)', // alpha unsupported in this subset
    ]) {
      expect(parseColor(bad), bad).toBeNull();
    }
  });

  test('hsl round-trips through rgb without drift', () => {
    const rgb = parseColor('#3366ff')!;
    const { h, s, l } = rgbToHsl(rgb);
    const back = hslToRgb(h, s, l);
    expect(back.r).toBeCloseTo(51, 0);
    expect(back.g).toBeCloseTo(102, 0);
    expect(back.b).toBeCloseTo(255, 0);
    expect(formatHsl(rgb)).toBe('hsl(225, 100%, 60%)');
  });

  test('formatting is canonical and lowercase', () => {
    expect(formatHex({ r: 255, g: 128, b: 0 })).toBe('#ff8000');
    expect(formatRgb({ r: 1, g: 2, b: 3 })).toBe('rgb(1, 2, 3)');
    expect(formatHsl({ r: 255, g: 0, b: 0 })).toBe('hsl(0, 100%, 50%)');
    expect(formatHex({ r: -5, g: 300, b: 10 })).toBe('#00ff0a'); // clamps
  });

  test('luminance: black 0, white 1, red 0.2126', () => {
    expect(luminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(luminance({ r: 255, g: 255, b: 255 })).toBe(1);
    expect(luminance({ r: 255, g: 0, b: 0 })).toBeCloseTo(0.2126, 4);
  });

  test('contrast: known WCAG pairs', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    const red = { r: 255, g: 0, b: 0 };
    const gray = { r: 118, g: 118, b: 118 }; // #767676
    const midGray = { r: 138, g: 138, b: 138 }; // #8a8a8a
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
    expect(contrastRatio(red, white)).toBeCloseTo(4.0, 1);
    // Documented AA-safe gray vs white (Tailwind slate-500 class of value).
    expect(contrastRatio(gray, white)).toBeGreaterThan(4.5);
    expect(contrastRatio(gray, white)).toBeLessThan(6);
    // Mid-gray vs white: clears AA large (>= 3) but not AA normal (< 4.5).
    const midWhite = contrastRatio(midGray, white);
    expect(midWhite).toBeGreaterThan(3);
    expect(midWhite).toBeLessThan(4.5);
  });
});

// ---------------------------------------------------------------------------
// Core state machine
// ---------------------------------------------------------------------------

describe('createColorPickerCore', () => {
  test('initial state derives defaults', () => {
    const picker = createColorPickerCore();
    expect(picker.state.value).toBe('#000000');
    expect(picker.state.format).toBe('hex');
    expect(picker.state.open).toBe(false);
    expect(picker.state.normalized).toBe('#000000');
    expect(picker.state.contrast).not.toBeNull();
    expect(picker.state.recent).toEqual([]);
    expect(picker.state.contrast!.white).toBeCloseTo(21, 0);
  });

  test('open seeds the draft from the committed value', () => {
    const picker = createColorPickerCore({ initial: '#3366ff' });
    picker.actions.open();
    expect(picker.state.open).toBe(true);
    expect(picker.state.draft).toBe('#3366ff');
    expect(picker.state.valid).toBe(true);
    expect(picker.state.normalized).toBe('#3366ff');
  });

  test('setDraft parses and derives validity; invalid draft yields null contrast', () => {
    const picker = createColorPickerCore({ initial: '#000000' });
    picker.actions.open();
    picker.actions.setDraft('#ff8800');
    expect(picker.state.draft).toBe('#ff8800');
    expect(picker.state.valid).toBe(true);
    expect(picker.state.normalized).toBe('#ff8800');
    expect(picker.state.contrast!.aaNormal).toBe(true); // orange on black/white

    picker.actions.setDraft('not a color');
    expect(picker.state.valid).toBe(false);
    expect(picker.state.normalized).toBeNull();
    expect(picker.state.contrast).toBeNull();
  });

  test('setDraft is ignored while closed', () => {
    const picker = createColorPickerCore({ initial: '#ff0000' });
    picker.actions.setDraft('#00ff00');
    expect(picker.state.value).toBe('#ff0000');
    expect(picker.state.draft).toBe('');
  });

  test('commit closes the picker, applies the draft, pushes the swatch', () => {
    const picker = createColorPickerCore({ initial: '#000000' });
    picker.actions.open();
    picker.actions.setDraft('#3366ff');
    expect(picker.actions.commit()).toBe(true);
    expect(picker.state.open).toBe(false);
    expect(picker.state.value).toBe('#3366ff');
    expect(picker.state.normalized).toBe('#3366ff');
    expect(picker.state.recent).toEqual(['#3366ff']);
  });

  test('commit rejects an invalid draft and keeps the picker open', () => {
    const picker = createColorPickerCore({ initial: '#000000' });
    picker.actions.open();
    picker.actions.setDraft('oops');
    expect(picker.actions.commit()).toBe(false);
    expect(picker.state.open).toBe(true);
    expect(picker.state.value).toBe('#000000');
  });

  test('cancel discards the draft', () => {
    const picker = createColorPickerCore({ initial: '#ff0000' });
    picker.actions.open();
    picker.actions.setDraft('#00ff00');
    picker.actions.cancel();
    expect(picker.state.open).toBe(false);
    expect(picker.state.value).toBe('#ff0000');
    // Cancel resets the draft to the committed value for next open.
    picker.actions.open();
    expect(picker.state.draft).toBe('#ff0000');
  });

  test('setValue validates and records; invalid returns false', () => {
    const picker = createColorPickerCore({ initial: '#000000' });
    expect(picker.actions.setValue('#00ff00')).toBe(true);
    expect(picker.state.value).toBe('#00ff00');
    expect(picker.state.recent).toEqual(['#00ff00']);
    expect(picker.actions.setValue('garbage')).toBe(false);
    expect(picker.state.value).toBe('#00ff00');
  });

  test('setValue while open syncs the draft', () => {
    const picker = createColorPickerCore({ initial: '#000000' });
    picker.actions.open();
    picker.actions.setDraft('#ff0000');
    picker.actions.setValue('#0000ff');
    expect(picker.state.draft).toBe('#0000ff');
    expect(picker.state.value).toBe('#0000ff');
  });

  test('format persists and re-renders the committed value', () => {
    const picker = createColorPickerCore({ initial: '#3366ff' });
    picker.actions.setFormat('hsl');
    expect(picker.state.value).toBe('hsl(225, 100%, 60%)');
    picker.actions.setFormat('rgb');
    expect(picker.state.value).toBe('rgb(51, 102, 255)');
    picker.actions.setFormat('hex');
    expect(picker.state.value).toBe('#3366ff');
    // Committed in hsl stays hsl on the next open/commit.
    picker.actions.setFormat('hsl');
    picker.actions.open();
    picker.actions.setDraft('#ff0000');
    picker.actions.commit();
    expect(picker.state.value).toBe('hsl(0, 100%, 50%)');
    expect(picker.state.format).toBe('hsl');
  });

  test('recent ring: MRU order, dedupe, bounded', () => {
    const picker = createColorPickerCore({ initial: '#000000', maxRecent: 3 });
    picker.actions.setValue('#111111');
    picker.actions.setValue('#222222');
    picker.actions.setValue('#333333');
    expect(picker.state.recent).toEqual(['#333333', '#222222', '#111111']);
    picker.actions.setValue('#222222'); // re-pick → moves to front
    expect(picker.state.recent).toEqual(['#222222', '#333333', '#111111']);
    picker.actions.setValue('#444444'); // ring full → oldest drops
    expect(picker.state.recent).toEqual(['#444444', '#222222', '#333333']);
  });

  test('maxRecent <= 0 disables the ring', () => {
    const picker = createColorPickerCore({ initial: '#000000', maxRecent: 0 });
    picker.actions.setValue('#123456');
    expect(picker.state.recent).toEqual([]);
  });

  test('contrast derives from the previewed color (draft while open)', () => {
    const picker = createColorPickerCore({ initial: '#ffffff' });
    expect(picker.state.contrast!.white).toBeCloseTo(1, 2); // white on white
    expect(picker.state.contrast!.black).toBeCloseTo(21, 0);
    expect(picker.state.contrast!.aaNormal).toBe(true); // via black
    picker.actions.open();
    picker.actions.setDraft('#ff0000');
    expect(picker.state.contrast!.white).toBeCloseTo(4.0, 1);
    expect(picker.state.contrast!.aaLarge).toBe(true);
    // Red passes AA normal via the black channel (5.25:1), not white.
    expect(picker.state.contrast!.aaNormal).toBe(true);
    expect(picker.state.contrast!.black).toBeGreaterThan(5);
    picker.actions.cancel();
    expect(picker.state.contrast!.white).toBeCloseTo(1, 2); // back to white
  });

  test('clearRecent empties the ring', () => {
    const picker = createColorPickerCore({ initial: '#000000' });
    picker.actions.setValue('#111111');
    picker.actions.clearRecent();
    expect(picker.state.recent).toEqual([]);
  });

  test('subscribe notifies per mutation and unsubscribes', () => {
    const picker = createColorPickerCore({ initial: '#000000' });
    let calls = 0;
    const unsubscribe = picker.subscribe(() => calls++);
    picker.actions.open();
    picker.actions.setDraft('#ff0000');
    picker.actions.commit();
    picker.actions.setFormat('hsl');
    expect(calls).toBe(4);
    unsubscribe();
    picker.actions.open();
    expect(calls).toBe(4);
  });

  test('no-op actions do not notify', () => {
    const picker = createColorPickerCore({ initial: '#ff0000' });
    let calls = 0;
    picker.subscribe(() => calls++);
    picker.actions.open(); // 1
    picker.actions.open(); // already open — no-op
    picker.actions.setDraft('#ff0000'); // same as seeded draft — no-op
    picker.actions.setFormat('hex'); // already hex — no-op
    picker.actions.clearRecent(); // empty — no-op
    expect(calls).toBe(1);
  });

  test('state is pure JSON — no functions leak', () => {
    const picker = createColorPickerCore({ initial: '#3366ff' });
    picker.actions.open();
    picker.actions.setDraft('#ff8800');
    const serialized = JSON.parse(JSON.stringify(picker.state));
    expect(serialized).toMatchObject({
      value: '#3366ff',
      format: 'hex',
      open: true,
      draft: '#ff8800',
      valid: true,
      normalized: '#ff8800',
    });
    expect(serialized.recent).toEqual([]);
    expect(serialized.contrast.aaNormal).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bridge contract + dual adapter (ADR 0034 §2/§3)
// ---------------------------------------------------------------------------

describe('colorpicker adapters', () => {
  test('svelte + vanilla mounted on one shared core agree', () => {
    const core = createColorPickerCore({ initial: '#000000' });
    const store = createColorPickerStore(core);
    const vanilla = createVanillaColorPicker(core);
    const values: string[] = [];
    const unsubValue = store.value.subscribe((v) => values.push(v));
    expect(values).toEqual(['#000000']);
    expect(store.core).toBe(core);
    expect(vanilla).toBe(core);

    store.actions.open();
    store.actions.setDraft('#00ff00');
    store.actions.commit();
    expect(store.state.subscribe).toBeTypeOf('function');
    expect(store.draft.subscribe).toBeTypeOf('function');
    expect(store.recent.subscribe).toBeTypeOf('function');
    expect(vanilla.state.value).toBe('#00ff00');
    expect(vanilla.state.recent).toEqual(['#00ff00']);
    expect(values[values.length - 1]).toBe('#00ff00');

    unsubValue();
  });

  test('react useColorPicker is a function', () => {
    expect(typeof useColorPicker).toBe('function');
  });

  test('svelte createColorPickerStore returns the documented surface', () => {
    const store = createColorPickerStore();
    expect(typeof store.actions.open).toBe('function');
    expect(typeof store.actions.setDraft).toBe('function');
    expect(typeof store.actions.commit).toBe('function');
    expect(typeof store.actions.cancel).toBe('function');
    expect(typeof store.actions.setValue).toBe('function');
    expect(typeof store.actions.setFormat).toBe('function');
    expect(typeof store.actions.clearRecent).toBe('function');
    expect(typeof store.state.subscribe).toBe('function');
    expect(typeof store.value.subscribe).toBe('function');
    expect(typeof store.draft.subscribe).toBe('function');
    expect(typeof store.recent.subscribe).toBe('function');
  });

  test('vanilla returns the core itself for shared mounts', () => {
    const core = createColorPickerCore({ initial: '#123456' });
    expect(createVanillaColorPicker(core)).toBe(core);
    const fresh = createVanillaColorPicker({ initial: '#abcdef' });
    expect(fresh).not.toBe(core);
    expect(fresh.state.value).toBe('#abcdef');
  });
});
