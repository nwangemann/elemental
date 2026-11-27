import type { Element } from './elements/schema.ts';
import { formatDensity, formatNumber, formatTemperature, UNKNOWN } from './elementFacts.ts';
import { NO_FILTERS, passesFilters, type Filters } from './explorer.ts';

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
  switch (key) {
    case 'yearDiscovered':
      return e.discoveredInAntiquity
        ? 'Antiquity'
        : e.yearDiscovered === null
          ? UNKNOWN
          : String(e.yearDiscovered);
    case 'density':
      return formatDensity(e.density, e.standardState);
    case 'meltingPoint':
    case 'boilingPoint':
      return formatTemperature(e[key]);
    case 'electronegativity':
      return withUnit(e.electronegativity, '');
    case 'atomicMass':
      return withUnit(e.atomicMass, ' u');
    case 'atomicRadius':
      return withUnit(e.atomicRadius, ' pm');
    case 'ionizationEnergy':
      return withUnit(e.ionizationEnergy, ' eV');
  }
}

function withUnit(v: number | null, unit: string): string {
  return v === null ? UNKNOWN : formatNumber(v) + unit;
}

/**
 * The height lens's key in a deep link's query (`#/Au?lens=density`), or null when there is
 * none or it names no lens.
 */
export function lensFromHash(hash: string): LensKey | null {
  const q = hash.indexOf('?');
  if (q < 0) return null;
  const key = new URLSearchParams(hash.slice(q + 1)).get('lens');
  return isLensKey(key) ? key : null;
}

/** The level of a tile whose element has no value for the lens's property. */
export const NO_DATA = -1;

/** What the scene shows: the property each lens reads (null = off), and the explorer's filters. */
export interface Lens {
  height: LensKey | null;
  colour: LensKey | null;
  filters: Filters;
}

export const NO_LENS: Readonly<Lens> = { height: null, colour: null, filters: NO_FILTERS };

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
  lensLevels(elements, key, LENS_SCALES[key], out);
  for (let i = 0; i < out.length; i++) {
    const level = out[i]!;
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
