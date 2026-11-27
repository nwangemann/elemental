import type { Category } from './elements/categories.ts';

/**
 * Base colour of each element family, as `#rrggbb` (sRGB). `themes.ts` builds each family's
 * theme (tile colour, awake surface, interface accent) on these.
 *
 * Light, slightly muted tones on a dark ground, so the "awake" effects added later stand out.
 */
export const CATEGORY_COLORS: Readonly<Record<Category, string>> = {
  alkali: '#f4a259',
  'alkaline-earth': '#f6d77e',
  transition: '#a5b8cc',
  'post-transition': '#b7c9a8',
  metalloid: '#7ccfc0',
  nonmetal: '#93d98a',
  halogen: '#f28b8b',
  'noble-gas': '#b9a2f2',
  lanthanide: '#f2a7d3',
  actinide: '#d6b38a',
};

/** Ink for tile labels; dark so it reads on every family colour. */
export const LABEL_COLOR = '#11151c';

/**
 * The ground the table stands on: a cool slate, lighter than the sky so the walkable area and
 * its edge read against the background, still dark enough for the tiles to stand out on it.
 */
export const GROUND_COLOR = '#2c3442';

/** Background behind the scene (also the fog colour). */
export const SKY_COLOR = '#0d1117';

/**
 * The colour lens's ramp, low to high: the light half of viridis (0.5 → 1, teal → green →
 * yellow). Viridis is perceptually even and reads for every common colour-vision deficiency; its
 * dark half is dropped so dark tile labels keep a 4.5 contrast on every stop. Luminance rises
 * from stop to stop, so the ramp also reads in greyscale. `rampColour` in `lens.ts` blends it.
 */
export const COLOUR_RAMP: readonly string[] = [
  '#21918c',
  '#1fa187',
  '#35b779',
  '#5ec962',
  '#90d743',
  '#c8e020',
  '#fde725',
];

/**
 * Tiles with no value under the colour lens: a neutral cool grey, so "unknown" reads apart from
 * every ramp colour (all saturated) and every family colour, with labels still readable on it.
 */
export const NO_DATA_COLOUR = '#8a8f96';

/** A colour as red, green and blue in linear light, 0–1 (the shape of three's `Color`). */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

function channel(hex: string, offset: number): number {
  const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** A `#rrggbb` colour in linear light, written into `out`. */
export function linearRgb(hex: string, out: Rgb = { r: 0, g: 0, b: 0 }): Rgb {
  out.r = channel(hex, 1);
  out.g = channel(hex, 3);
  out.b = channel(hex, 5);
  return out;
}

/** WCAG relative luminance of a linear-light colour. */
export function rgbLuminance(c: Rgb): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/** WCAG relative luminance of a `#rrggbb` colour. */
export function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** WCAG contrast ratio between two `#rrggbb` colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The character's body: a warm cream that reads against every family colour and the ground. */
export const CHARACTER_COLOR = '#f5ead6';

/** The character's eyes. */
export const EYE_COLOR = '#11151c';

/** Highlight ring around the tile the character stands on: warm white, drawn unlit. */
export const RING_COLOR = '#fff1c9';

/** The element panel's surface (slightly lighter than the sky, so it lifts off the scene). */
export const PANEL_COLOR = '#161b22';

/** Body text on the panel, and the quieter text for labels and notes. */
export const PANEL_TEXT = '#e6edf3';
export const PANEL_MUTED = '#9da7b3';
