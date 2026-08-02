/**
 * Color math for the colorpicker core — parse/format/contrast.
 *
 * Minimal, dependency-free subset (hex/rgb/hsl, no alpha, no named colors).
 * Culori is the reference implementation for broader format support; if
 * alpha or named colors become a requirement, swap this module for culori
 * behind the same functions (ADR 0034 §6.9 adoption rule).
 *
 * @module trellis/colorpicker
 */

/** sRGB triplet, 0-255 per channel. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGB_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
const HSL_RE = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/;

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

/** Parse a hex/rgb/hsl string to an sRGB triplet; null when unparsable. */
export function parseColor(input: string): Rgb | null {
  const trimmed = input.trim();
  const hex = HEX_RE.exec(trimmed);
  if (hex) {
    let digits = hex[1]!;
    if (digits.length === 3) {
      digits = digits
        .split('')
        .map((d) => d + d)
        .join('');
    }
    const value = Number.parseInt(digits, 16);
    return {
      r: (value >> 16) & 0xff,
      g: (value >> 8) & 0xff,
      b: value & 0xff,
    };
  }

  const rgb = RGB_RE.exec(trimmed);
  if (rgb) {
    const [r, g, b] = [rgb[1]!, rgb[2]!, rgb[3]!].map(Number);
    if ([r, g, b].some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
      return null;
    }
    return { r, g, b };
  }

  const hsl = HSL_RE.exec(trimmed);
  if (hsl) {
    const h = Number(hsl[1]);
    const s = Number(hsl[2]);
    const l = Number(hsl[3]);
    if (
      !Number.isFinite(h) ||
      !Number.isFinite(s) ||
      !Number.isFinite(l) ||
      s < 0 ||
      s > 100 ||
      l < 0 ||
      l > 100
    ) {
      return null;
    }
    return hslToRgb((h % 360 + 360) % 360, s, l);
  }

  return null;
}

/** Format a triplet as `#rrggbb` (lowercase). */
export function formatHex({ r, g, b }: Rgb): string {
  const to2 = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/** Format a triplet as `rgb(r, g, b)`. */
export function formatRgb({ r, g, b }: Rgb): string {
  return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)})`;
}

/** Format a triplet as `hsl(h, s%, l%)` (integers). */
export function formatHsl(rgb: Rgb): string {
  const { h, s, l } = rgbToHsl(rgb);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/** HSL (h 0-360, s/l 0-100) → sRGB triplet. */
export function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l / 100 - 1)) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l / 100 - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

/** sRGB triplet → HSL (h 0-360, s/l 0-100). */
export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

/** WCAG 2.x relative luminance (0-1) of an sRGB triplet. */
export function luminance({ r, g, b }: Rgb): number {
  const linear = (n: number) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two sRGB triplets (1-21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export const WHITE: Rgb = { r: 255, g: 255, b: 255 };
export const BLACK: Rgb = { r: 0, g: 0, b: 0 };
