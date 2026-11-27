import type { Element } from './elements/schema.ts';
import { formatDensity, formatNumber, formatTemperature, UNKNOWN } from './elementFacts.ts';
import { NO_FILTERS, passesFilters, type Filters } from './explorer.ts';
import { COLOUR_RAMP, linearRgb, NO_DATA_COLOUR, type Rgb } from './palette.ts';
import { themeOf } from './themes.ts';

/**
 * Lenses: ways of reading the whole table at once. A lens maps one numeric property to a level in
 * [0, 1] per tile (`lensLevels`), so the same numbers can drive a tile's height (3.F3) or tint
 * (the colour lens). Elements with no value get `NO_DATA` instead of a level, and renderers give
 * them their own "no data" look. Filter dimming is the simplest lens: the explorer's filters give
 * each tile a match (1) or no match (0), and tiles that do not match fade back.
 */

/** Properties a lens can show. All numeric; each has a default scale in `LENS_SCALES`. */
export const LENS_KEYS = [
  'atomicMass',
  'density',
  'electronegativity',
  'meltingPoint',
  'boilingPoint',
  'atomicRadius',
  'ionizationEnergy',
  'yearDiscovered',
] as const;
export type LensKey = (typeof LENS_KEYS)[number];

export type LensScale = 'linear' | 'log';

/**
 * Density spans six orders of magnitude (hydrogen gas to osmium), so it reads on a log scale;
 * everything else spreads evenly enough on a linear one.
 */
export const LENS_SCALES: Readonly<Record<LensKey, LensScale>> = {
  atomicMass: 'linear',
  density: 'log',
  electronegativity: 'linear',
  meltingPoint: 'linear',
  boilingPoint: 'linear',
  atomicRadius: 'linear',
  ionizationEnergy: 'linear',
  yearDiscovered: 'linear',
};

/** What the lens control and the list call each property. */
export const LENS_LABELS: Readonly<Record<LensKey, string>> = {
  atomicMass: 'Atomic mass',
  density: 'Density',
  electronegativity: 'Electronegativity',
  meltingPoint: 'Melting point',
  boilingPoint: 'Boiling point',
  atomicRadius: 'Atomic radius',
  ionizationEnergy: 'Ionization energy',
  yearDiscovered: 'Discovery year',
};

export function isLensKey(v: unknown): v is LensKey {
  return typeof v === 'string' && (LENS_KEYS as readonly string[]).includes(v);
}

/** The lens after `current` in the cycle off → each key → off; `step` −1 goes backward. */
export function cycleLens(current: LensKey | null, step: 1 | -1): LensKey | null {
  const order = [null, ...LENS_KEYS];
  const i = order.indexOf(current);
  return order[(i + step + order.length) % order.length] ?? null;
}

/** An element's value for a lens as text, with its unit, for the list's lens column. */
export function lensValueLabel(e: Element, key: LensKey): string {
  return formatLensValue(lensValue(e, key), key, e.standardState);
}

/**
 * A raw lens value as text with its unit. Density reads in g/L for a gas (`state`), as on the
 * panel; `-Infinity` on the discovery lens is antiquity.
 */
export function formatLensValue(
  v: number | null,
  key: LensKey,
  state: Element['standardState'] = 'solid',
): string {
  switch (key) {
    case 'yearDiscovered':
      return v === -Infinity ? 'Antiquity' : v === null ? UNKNOWN : String(Math.round(v));
    case 'density':
      return formatDensity(v, state);
    case 'meltingPoint':
    case 'boilingPoint':
      return formatTemperature(v);
    case 'electronegativity':
      return withUnit(v, '');
    case 'atomicMass':
      return withUnit(v, ' u');
    case 'atomicRadius':
      return withUnit(v, ' pm');
    case 'ionizationEnergy':
      return withUnit(v, ' eV');
  }
}

function withUnit(v: number | null, unit: string): string {
  return v === null ? UNKNOWN : formatNumber(v) + unit;
}

/** The query parameter each lens takes in a deep link: `?lens=` for height, `?colour=` for tint. */
export const LENS_PARAMS = { height: 'lens', colour: 'colour' } as const;

/**
 * A lens's key in a deep link's query (`#/Au?lens=density&colour=meltingPoint`), or null when
 * there is none or it names no lens. `which` picks the height lens (default) or the colour lens.
 */
export function lensFromHash(
  hash: string,
  which: keyof typeof LENS_PARAMS = 'height',
): LensKey | null {
  const q = hash.indexOf('?');
  if (q < 0) return null;
  const key = new URLSearchParams(hash.slice(q + 1)).get(LENS_PARAMS[which]);
  return isLensKey(key) ? key : null;
}

/** The level of a tile whose element has no value for the lens's property. */
export const NO_DATA = -1;

/** What the scene shows: the property each lens reads (null = off), and the explorer's filters. */
export interface Lens {
  height: LensKey | null;
  colour: LensKey | null;
  /** The temperature lens's temperature in kelvin (`core/temperature.ts`), or null when off. */
  temperature: number | null;
  /** The discovery lens's year (`core/discovery.ts`, `ANTIQUITY` for the stop), or null when off. */
  year: number | null;
  filters: Filters;
}

export const NO_LENS: Readonly<Lens> = {
  height: null,
  colour: null,
  temperature: null,
  year: null,
  filters: NO_FILTERS,
};

/**
 * An element's raw value for a lens, or null when unknown. Elements known since antiquity come
 * before every dated discovery (−Infinity, which lands on level 0).
 */
export function lensValue(e: Element, key: LensKey): number | null {
  if (key === 'yearDiscovered') return e.discoveredInAntiquity ? -Infinity : e.yearDiscovered;
  return e[key];
}

/** The scale's transform. Log of a value at or below zero has no place on the scale. */
function transform(v: number, scale: LensScale): number | null {
  if (scale === 'linear') return v;
  return v > 0 ? Math.log10(v) : null;
}

export interface LensDomain {
  /** Smallest and largest transformed value among the known, finite values. */
  min: number;
  max: number;
}

/** The range a lens spreads over, or null when no element has a usable value. */
export function lensDomain(
  elements: readonly Element[],
  key: LensKey,
  scale: LensScale = LENS_SCALES[key],
): LensDomain | null {
  let min = Infinity;
  let max = -Infinity;
  for (const e of elements) {
    const raw = lensValue(e, key);
    if (raw === null || !Number.isFinite(raw)) continue;
    const t = transform(raw, scale);
    if (t === null) continue;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return min <= max ? { min, max } : null;
}

/**
 * One value's level in [0, 1] on `domain`, or `NO_DATA`. A domain of one value puts everything
 * at 1, so a lens over a single known element still shows it.
 */
export function lensLevel(value: number | null, domain: LensDomain, scale: LensScale): number {
  if (value === null || Number.isNaN(value)) return NO_DATA;
  if (value === -Infinity) return 0;
  if (value === Infinity) return 1;
  const t = transform(value, scale);
  if (t === null) return 0;
  const span = domain.max - domain.min;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (t - domain.min) / span));
}

/**
 * Every element's level for a lens, in element order, written into `out` (allocated when not
 * given). With no usable values at all, every tile is `NO_DATA`.
 */
export function lensLevels(
  elements: readonly Element[],
  key: LensKey,
  scale: LensScale = LENS_SCALES[key],
  out: Float32Array = new Float32Array(elements.length),
): Float32Array {
  const domain = lensDomain(elements, key, scale);
  for (let i = 0; i < elements.length; i++)
    out[i] = domain ? lensLevel(lensValue(elements[i]!, key), domain, scale) : NO_DATA;
  return out;
}

/** True when any explorer filter is set, so the table should dim what does not match. */
export function hasFilters(f: Filters): boolean {
  return Object.values(f).some((v) => v !== null);
}

/**
 * Each tile's dim target for the explorer's filters: 0 for a match (and for every tile when no
 * filter is set), 1 for a tile the filters exclude.
 */
export function filterDim(
  elements: readonly Element[],
  filters: Filters,
  out: Float32Array = new Float32Array(elements.length),
): Float32Array {
  const any = hasFilters(filters);
  for (let i = 0; i < elements.length; i++)
    out[i] = any && !passesFilters(elements[i]!, filters) ? 1 : 0;
  return out;
}

/**
 * A second source of tile dim beside the explorer's filters: combine mode's suggestions (ADR 20).
 * Whoever owns it writes `targets` and sets `changed`; the tiles merge it on their next frame.
 * `active` false means it adds nothing.
 */
export interface DimLayer {
  targets: Float32Array;
  active: boolean;
  changed: boolean;
}

export function createDimLayer(n: number): DimLayer {
  return { targets: new Float32Array(n), active: false, changed: false };
}

/** Each tile's dim target from the filters and a layer: the stronger of the two. */
export function mergeDim(filter: Float32Array, layer: DimLayer, out: Float32Array): Float32Array {
  for (let i = 0; i < out.length; i++)
    out[i] = layer.active ? Math.max(filter[i]!, layer.targets[i]!) : filter[i]!;
  return out;
}

/**
 * Merges the layer into `targets` if its owner changed it since the last call, and clears the
 * flag. Returns true when the targets changed, so the dim starts moving.
 */
export function takeDimLayer(
  filter: Float32Array,
  layer: DimLayer,
  targets: Float32Array,
): boolean {
  if (!layer.changed) return false;
  layer.changed = false;
  mergeDim(filter, layer, targets);
  return true;
}

/**
 * Moves each dim level toward its target at a constant rate (a full fade takes `duration`
 * seconds; 0 snaps). Returns true while anything is still moving, so renderers can go quiet.
 */
export function stepDim(
  levels: Float32Array,
  targets: Float32Array,
  dt: number,
  duration: number,
): boolean {
  const step = duration > 0 ? dt / duration : Infinity;
  let moving = false;
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]!;
    const target = targets[i]!;
    if (level === target) continue;
    levels[i] = level < target ? Math.min(target, level + step) : Math.max(target, level - step);
    if (levels[i] !== target) moving = true;
  }
  return moving;
}

/**
 * How dim a tile is drawn: its dim level, lifted as the tile wakes, so the tile under the
 * character always shows its own colour even when the filters exclude it.
 */
export function shownDim(dim: number, awake: number): number {
  return dim * (1 - awake);
}

/** How tall the height lens draws: the top tile's lift, and the lift of the lowest known value. */
export interface LiftParams {
  lensHeight: number;
  lensFloor: number;
}

/**
 * Each tile's target lift for the height lens: the level spread from `lensFloor` up to
 * `lensHeight`, and 0 for no data (and for every tile with the lens off), so a missing value
 * stays at rest height, below every known one.
 */
export function liftTargets(
  elements: readonly Element[],
  key: LensKey | null,
  p: LiftParams,
  out: Float32Array = new Float32Array(elements.length),
): Float32Array {
  if (key === null) return out.fill(0);
  return liftFromLevels(lensLevels(elements, key, LENS_SCALES[key], out), p, out);
}

/**
 * Lifts for levels in [0, 1] (or `NO_DATA`, which stays at rest), as `liftTargets` spreads them.
 * Combine's contexts raise tiles by share this way. `out` may be `levels`.
 */
export function liftFromLevels(
  levels: Float32Array,
  p: LiftParams,
  out: Float32Array = new Float32Array(levels.length),
): Float32Array {
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]!;
    out[i] = level === NO_DATA ? 0 : p.lensFloor + level * (p.lensHeight - p.lensFloor);
  }
  return out;
}

/**
 * A height lens change in flight: every tile eases together from where it was (`from`) to its
 * new lift (`to`), so the table moves as one. `t` runs 0 → 1; at 1 nothing moves.
 */
export interface LiftEase {
  from: Float32Array;
  to: Float32Array;
  t: number;
}

export function createLiftEase(lift: Float32Array): LiftEase {
  return { from: lift.slice(), to: lift.slice(), t: 1 };
}

/** Starts easing from the current lift toward `targets` (copied). */
export function retargetLift(ease: LiftEase, lift: Float32Array, targets: Float32Array): void {
  ease.from.set(lift);
  ease.to.set(targets);
  ease.t = 0;
}

/**
 * Advances the ease by `dt` over `duration` seconds (0 snaps), smoothstepped, writing `lift` and
 * setting `dirty[i]` for each tile that moved. Allocation-free. Returns true when any tile moved.
 */
export function stepLift(
  ease: LiftEase,
  lift: Float32Array,
  dirty: Uint8Array,
  dt: number,
  duration: number,
): boolean {
  if (ease.t >= 1) return false;
  ease.t = duration > 0 ? Math.min(1, ease.t + dt / duration) : 1;
  const k = ease.t * ease.t * (3 - 2 * ease.t);
  let moved = false;
  for (let i = 0; i < lift.length; i++) {
    const from = ease.from[i]!;
    const to = ease.to[i]!;
    const next = ease.t >= 1 ? to : from + (to - from) * k;
    if (next === lift[i]) continue;
    lift[i] = next;
    dirty[i] = 1;
    moved = true;
  }
  return moved;
}

/**
 * The colour lens's ramp at `level` (0–1), or `NO_DATA_COLOUR` for `NO_DATA`, in linear light,
 * written into `out` (a three `Color` fits). Stops are blended in linear light, so luminance rises
 * steadily along the ramp. Allocation-free.
 */
export function rampColour(level: number, out: Rgb): Rgb {
  if (level === NO_DATA || Number.isNaN(level)) return linearRgb(NO_DATA_COLOUR, out);
  const x = Math.min(1, Math.max(0, level)) * (RAMP_LINEAR.length - 1);
  const i = Math.min(RAMP_LINEAR.length - 2, Math.floor(x));
  const k = x - i;
  const a = RAMP_LINEAR[i]!;
  const b = RAMP_LINEAR[i + 1]!;
  out.r = a.r + (b.r - a.r) * k;
  out.g = a.g + (b.g - a.g) * k;
  out.b = a.b + (b.b - a.b) * k;
  return out;
}

const RAMP_LINEAR: readonly Rgb[] = COLOUR_RAMP.map((hex) => linearRgb(hex));

/**
 * Each tile's target colour for the colour lens, as linear-light RGB triples in element order
 * (`out[3i…3i+2]`): its ramp colour (or the no-data colour) with a lens on, its family colour
 * with the lens off. The scene eases instance colours toward these.
 */
export function colourTargets(
  elements: readonly Element[],
  key: LensKey | null,
  out: Float32Array = new Float32Array(elements.length * 3),
): Float32Array {
  const levels = key === null ? null : lensLevels(elements, key);
  const c: Rgb = { r: 0, g: 0, b: 0 };
  for (let i = 0; i < elements.length; i++) {
    if (levels) rampColour(levels[i]!, c);
    else linearRgb(themeOf(elements[i]!.category).color, c);
    out[i * 3] = c.r;
    out[i * 3 + 1] = c.g;
    out[i * 3 + 2] = c.b;
  }
  return out;
}

/**
 * A colour lens change in flight: every tile's lens colour eases together from `from` to `to`
 * (linear-light RGB triples, as `colourTargets` writes them), smoothstepped as `t` runs 0 → 1.
 * `moved` is true when the last `stepTint` changed the colours, so renderers rewrite them only
 * then (and for tiles whose activation changed).
 */
export interface TintEase {
  from: Float32Array;
  to: Float32Array;
  t: number;
  moved: boolean;
}

/** An ease resting at `targets` (copied). */
export function createTintEase(targets: Float32Array): TintEase {
  return { from: targets.slice(), to: targets.slice(), t: 1, moved: false };
}

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** Starts easing from the colours shown now (mid-ease included) toward `targets` (copied). */
export function retargetTint(ease: TintEase, targets: Float32Array): void {
  const k = smoothstep(ease.t);
  for (let j = 0; j < ease.from.length; j++)
    ease.from[j] = ease.from[j]! + (ease.to[j]! - ease.from[j]!) * k;
  ease.to.set(targets);
  ease.t = 0;
}

/**
 * Advances the ease by `dt` over `duration` seconds (0 snaps) and sets `moved`. Returns `moved`.
 */
export function stepTint(ease: TintEase, dt: number, duration: number): boolean {
  ease.moved = ease.t < 1;
  if (ease.moved) ease.t = duration > 0 ? Math.min(1, ease.t + dt / duration) : 1;
  return ease.moved;
}

/**
 * Tile i's drawn colour in linear light, into `out`: its eased lens colour, blended back toward
 * its family colour (`theme`, `colourTargets` with no lens) by how awake it is (0–1), so the tile
 * underfoot keeps its theme. Allocation-free.
 */
export function tintAt(
  ease: TintEase,
  theme: Float32Array,
  i: number,
  awake: number,
  out: Rgb,
): Rgb {
  const k = smoothstep(ease.t);
  const j = i * 3;
  const r = ease.from[j]! + (ease.to[j]! - ease.from[j]!) * k;
  const g = ease.from[j + 1]! + (ease.to[j + 1]! - ease.from[j + 1]!) * k;
  const b = ease.from[j + 2]! + (ease.to[j + 2]! - ease.from[j + 2]!) * k;
  out.r = r + (theme[j]! - r) * awake;
  out.g = g + (theme[j + 1]! - g) * awake;
  out.b = b + (theme[j + 2]! - b) * awake;
  return out;
}

/** What the colour lens's legend shows: the ends and middle of the ramp as text with units. */
export interface LensLegend {
  key: LensKey;
  label: string;
  /** Values at level 0, 0.5 and 1. */
  min: string;
  mid: string;
  max: string;
  /** True when the ramp spreads on a log scale, so the middle is not the average. */
  log: boolean;
  /** How many elements have no value (drawn in the no-data colour). */
  noData: number;
}

/**
 * The legend for a lens over `elements`, or null when no element has a usable value. The ends
 * are the actual lowest and highest elements (so a gas's density reads in g/L, and the earliest
 * discoveries read "Antiquity"); the middle is the value at level 0.5 on the lens's scale.
 */
export function lensLegend(elements: readonly Element[], key: LensKey): LensLegend | null {
  const scale = LENS_SCALES[key];
  const domain = lensDomain(elements, key, scale);
  if (!domain) return null;
  const levels = lensLevels(elements, key, scale);
  let lo = -1;
  let hi = -1;
  let noData = 0;
  for (let i = 0; i < elements.length; i++) {
    const level = levels[i]!;
    if (level === NO_DATA) {
      noData++;
      continue;
    }
    // Ties keep the first at the low end, so antiquity (−Infinity) wins over the earliest year.
    if (lo < 0 || level < levels[lo]! || (level === levels[lo] && isLower(elements, key, i, lo)))
      lo = i;
    if (hi < 0 || level > levels[hi]!) hi = i;
  }
  const midT = (domain.min + domain.max) / 2;
  const mid = scale === 'log' ? 10 ** midT : midT;
  return {
    key,
    label: LENS_LABELS[key],
    min: lensValueLabel(elements[lo]!, key),
    mid: formatLensValue(mid, key),
    max: lensValueLabel(elements[hi]!, key),
    log: scale === 'log',
    noData,
  };
}

function isLower(elements: readonly Element[], key: LensKey, i: number, j: number): boolean {
  return (lensValue(elements[i]!, key) ?? Infinity) < (lensValue(elements[j]!, key) ?? Infinity);
}
