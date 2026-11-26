import type { Category } from './elements/categories.ts';
import { CATEGORY_COLORS, LABEL_COLOR } from './palette.ts';

/**
 * How a tile's surface looks when fully awake. `roughness` and `metalness` are the usual PBR
 * values; `glow` is the emissive strength (0 = none) in `glowColor`; `pulse` (0–1) is how deeply
 * that glow breathes over time, for the restless families.
 */
export interface TileSurface {
  roughness: number;
  metalness: number;
  glow: number;
  glowColor: string;
  pulse: number;
}

/**
 * One element family's look, as data. The tile's base colour, the surface it wakes into when the
 * character steps on it, and the accent tokens the DOM interface takes from it, so the panel
 * "turns" with the tile. Hero overrides for single elements (gold, mercury, …) will extend this
 * same shape. Particle presets join it in phase 2.
 */
export interface Theme {
  /** Tile base colour, `#rrggbb` (sRGB). Also the legend colour of the family. */
  color: string;
  awake: TileSurface;
  /** Interface accent (headings, rules, the symbol) and the ink for text on an accent fill. */
  accent: string;
  accentInk: string;
  /** What the awake surface is meant to suggest, for docs and the tuning panel. */
  note: string;
}

type Awake = Omit<TileSurface, 'glowColor'> & { glowColor?: string };

function family(category: Category, note: string, awake: Awake): Theme {
  const color = CATEGORY_COLORS[category];
  return {
    color,
    awake: { ...awake, glowColor: awake.glowColor ?? color },
    accent: color,
    accentInk: LABEL_COLOR,
    note,
  };
}

/** Every family's theme. Values are first passes, meant to be tuned by eye. */
export const THEMES: Readonly<Record<Category, Theme>> = {
  alkali: family('alkali', 'Reactive soft metal with a warm, restless fizz.', {
    roughness: 0.35,
    metalness: 0.55,
    glow: 0.25,
    glowColor: '#ffb066',
    pulse: 0.6,
  }),
  'alkaline-earth': family('alkaline-earth', 'Chalky mineral: matte and pale.', {
    roughness: 0.95,
    metalness: 0,
    glow: 0.05,
    pulse: 0,
  }),
  transition: family('transition', 'Brushed metal that catches the light.', {
    roughness: 0.28,
    metalness: 1,
    glow: 0,
    pulse: 0,
  }),
  'post-transition': family('post-transition', 'Soft, duller metal.', {
    roughness: 0.45,
    metalness: 0.8,
    glow: 0,
    pulse: 0,
  }),
  metalloid: family('metalloid', 'Glassy crystal with sharp highlights.', {
    roughness: 0.08,
    metalness: 0.35,
    glow: 0.08,
    pulse: 0,
  }),
  nonmetal: family('nonmetal', 'Organic and airy, a soft living glow.', {
    roughness: 0.75,
    metalness: 0,
    glow: 0.2,
    pulse: 0.25,
  }),
  halogen: family('halogen', 'Coloured vapour hanging over the tile.', {
    roughness: 0.5,
    metalness: 0,
    glow: 0.4,
    pulse: 0.35,
  }),
  'noble-gas': family('noble-gas', 'A neon tube switched on.', {
    roughness: 0.2,
    metalness: 0,
    glow: 1,
    glowColor: '#c9a8ff',
    pulse: 0.08,
  }),
  lanthanide: family('lanthanide', 'Rare-earth metal with a pink sheen.', {
    roughness: 0.22,
    metalness: 0.75,
    glow: 0.15,
    glowColor: '#ffb3e1',
    pulse: 0,
  }),
  actinide: family('actinide', 'Radioactive: a slow, pulsing green glow.', {
    roughness: 0.4,
    metalness: 0.6,
    glow: 0.6,
    glowColor: '#9dff7a',
    pulse: 0.7,
  }),
};

export function themeOf(category: Category): Theme {
  return THEMES[category];
}

/**
 * Colour tokens the DOM interface takes from the element under the character: `accent` for
 * headings, rules and the symbol, `accentInk` for text on an accent-filled surface.
 */
export interface AccentTokens {
  accent: string;
  accentInk: string;
}

export function accentTokens(category: Category): AccentTokens {
  const { accent, accentInk } = THEMES[category];
  return { accent, accentInk };
}

/** The surface every tile shares at rest, before its family's character mixes in. */
export interface BaseSurface {
  roughness: number;
  metalness: number;
}

/**
 * A tile's surface at activation `level` (0 at rest, 1 awake; pass it already eased). At rest the
 * tile sits `restMix` of the way from the shared base surface toward its family's, so families
 * differ a little even asleep, and it has no glow. Waking blends the rest of the way and fades the
 * glow and its pulse in. Writes `[roughness, metalness, glow, pulse]` into `out` at `offset`, so
 * renderers can fill an instance buffer without allocating.
 */
export function surfaceAt(
  awake: TileSurface,
  base: BaseSurface,
  restMix: number,
  level: number,
  out: Float32Array,
  offset = 0,
): void {
  const mix = restMix + (1 - restMix) * level;
  out[offset] = base.roughness + (awake.roughness - base.roughness) * mix;
  out[offset + 1] = base.metalness + (awake.metalness - base.metalness) * mix;
  out[offset + 2] = awake.glow * level;
  out[offset + 3] = awake.pulse * level;
}
