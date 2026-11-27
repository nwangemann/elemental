import type { Element } from './elements/index.ts';

/**
 * The temperature lens (ADR 0018): the state each element is in at a temperature T and 1 atm,
 * read from its melting and boiling points, plus the slider's non-linear scale and deep link.
 */

export type Phase = 'solid' | 'liquid' | 'gas' | 'unknown';

/** One number per phase, as `phaseTargets` writes them for the scene (0 solid → 1 liquid → 2 gas). */
export const PHASE_CODE: Readonly<Record<Phase, number>> = {
  solid: 0,
  liquid: 1,
  gas: 2,
  unknown: 3,
};

/** Lowest and highest temperature the lens shows, in kelvin (the highest boiling point is 5,869 K). */
export const T_MIN = 0;
export const T_MAX = 6000;

/**
 * Elements whose stored points do not describe 1 atm, so the plain rule would be wrong.
 *
 * - Helium: its melting point (0.95 K) is measured at about 25 atm. At 1 atm it never freezes,
 *   so it is liquid from 0 K up to its boiling point.
 *
 * Sublimation needs no entry: wherever the boiling point is at or below the melting point (only
 * arsenic in the data: it sublimes at 887 K, and its 1,090 K melting point is under pressure),
 * `phaseAt` goes straight from solid to gas at the boiling point.
 */
const NEVER_SOLID: ReadonlySet<string> = new Set(['He']);

/**
 * The state of `e` at `kelvin` and 1 atm. Solid below the melting point, liquid below the boiling
 * point, gas above (both edges belong to the warmer state). Unknown when there is no melting
 * point, or above the melting point with no boiling point: the lens shows no guess.
 */
export function phaseAt(
  e: Pick<Element, 'symbol' | 'meltingPoint' | 'boilingPoint'>,
  kelvin: number,
): Phase {
  const mp = NEVER_SOLID.has(e.symbol) ? -Infinity : e.meltingPoint;
  const bp = e.boilingPoint;
  if (mp === null) return 'unknown';
  if (bp !== null && bp <= mp) return kelvin < bp ? 'solid' : 'gas';
  if (kelvin < mp) return 'solid';
  if (bp === null) return 'unknown';
  return kelvin < bp ? 'liquid' : 'gas';
}

/** Writes each element's `PHASE_CODE` at `kelvin` into `out` (one per tile, in element order). */
export function phaseTargets(
  elements: readonly Element[],
  kelvin: number,
  out: Float32Array,
): Float32Array {
  for (let i = 0; i < elements.length; i++) out[i] = PHASE_CODE[phaseAt(elements[i]!, kelvin)];
  return out;
}

/** How many elements are in each state at `kelvin`. */
export function phaseCounts(elements: readonly Element[], kelvin: number): Record<Phase, number> {
  const counts = { solid: 0, liquid: 0, gas: 0, unknown: 0 };
  for (const e of elements) counts[phaseAt(e, kelvin)]++;
  return counts;
}

/**
 * The slider's scale: a log scale with an offset, `K = K0 · ((1 + T_MAX/K0)^p − 1)`, so 0 maps to
 * 0 K, 1 to `T_MAX`, and the 0–400 K range takes almost half the track (room temperature sits at
 * about 0.40). `K0` sets where the scale turns from linear to logarithmic.
 */
const K0 = 50;
const BASE = Math.log1p(T_MAX / K0);

/** The temperature at slider position `p` (0–1, clamped). */
export function kelvinAt(p: number): number {
  const c = Math.min(1, Math.max(0, p));
  return K0 * Math.expm1(c * BASE);
}

/** The slider position (0–1) of `kelvin` (clamped to `T_MIN`–`T_MAX`); the inverse of `kelvinAt`. */
export function positionOf(kelvin: number): number {
  const k = Math.min(T_MAX, Math.max(T_MIN, kelvin));
  return Math.log1p(k / K0) / BASE;
}

/** Temperatures the slider snaps to, with their labels. */
export const DETENTS: readonly { kelvin: number; label: string }[] = [
  { kelvin: 298.15, label: 'Room' },
  { kelvin: 310.15, label: 'Body' },
  { kelvin: 373.15, label: 'Water boils' },
];

/**
 * How close, in slider position, a drag must come to a detent to snap to it. Room and body
 * temperature are only about 0.008 apart, so the window stays under half of that.
 */
export const DETENT_WINDOW = 0.003;

/** The temperature at slider position `p`, snapped to the nearest detent within `DETENT_WINDOW`. */
export function snapKelvin(p: number): number {
  let best: number | null = null;
  let bestGap = DETENT_WINDOW;
  for (const d of DETENTS) {
    const gap = Math.abs(positionOf(d.kelvin) - p);
    if (gap <= bestGap) {
      best = d.kelvin;
      bestGap = gap;
    }
  }
  return best ?? kelvinAt(p);
}

/** The query parameter the temperature takes in a deep link: `#/Ga?t=310.15`. */
export const TEMPERATURE_PARAM = 't';

/** The temperature in a deep link's query, in kelvin (clamped to the scale), or null. */
export function temperatureFromHash(hash: string): number | null {
  const q = hash.indexOf('?');
  if (q < 0) return null;
  const raw = new URLSearchParams(hash.slice(q + 1)).get(TEMPERATURE_PARAM);
  if (raw === null || raw.trim() === '') return null;
  const k = Number(raw);
  if (!Number.isFinite(k)) return null;
  return Math.min(T_MAX, Math.max(T_MIN, k));
}

/** A temperature as a deep link writes it: kelvin to at most two decimals (`310.15`, `1200`). */
export function temperatureParam(kelvin: number): string {
  return String(Math.round(kelvin * 100) / 100);
}

/**
 * The temperature lens as the scene draws it. `levels[i]` is tile i's shown phase, 0 solid →
 * 1 liquid → 2 gas, easing toward `targets` at one state per `duration`; `unknown[i]` (0–1) eases
 * toward 1 for tiles whose phase is unknown, which keep the solid look and take the dim. With the
 * lens off every target is 0. `moved` is true when the last `stepPhase` changed anything, so
 * renderers rewrite only then; `moving` while it is still on its way.
 */
export interface PhaseEase {
  levels: Float32Array;
  targets: Float32Array;
  unknown: Float32Array;
  unknownTargets: Float32Array;
  moved: boolean;
  moving: boolean;
}

/** Writes each tile's target shown phase (0–2) and unknown flag (0 or 1) at `kelvin` (null = off). */
export function phaseEaseTargets(
  elements: readonly Element[],
  kelvin: number | null,
  phase: Float32Array,
  unknown: Float32Array,
): void {
  for (let i = 0; i < elements.length; i++) {
    const p = kelvin === null ? 'solid' : phaseAt(elements[i]!, kelvin);
    phase[i] = p === 'unknown' ? 0 : PHASE_CODE[p];
    unknown[i] = p === 'unknown' ? 1 : 0;
  }
}

/** An ease resting at the lens for `kelvin`, so a lens present at mount starts in place. */
export function createPhaseEase(elements: readonly Element[], kelvin: number | null): PhaseEase {
  const targets = new Float32Array(elements.length);
  const unknownTargets = new Float32Array(elements.length);
  phaseEaseTargets(elements, kelvin, targets, unknownTargets);
  return {
    levels: targets.slice(),
    targets,
    unknown: unknownTargets.slice(),
    unknownTargets,
    moved: false,
    moving: false,
  };
}

/** Points the ease at `kelvin` (null = off); tiles move on from wherever they are now. */
export function retargetPhase(
  ease: PhaseEase,
  elements: readonly Element[],
  kelvin: number | null,
): void {
  phaseEaseTargets(elements, kelvin, ease.targets, ease.unknownTargets);
  ease.moving = true;
}

function approach(levels: Float32Array, targets: Float32Array, step: number): boolean {
  let changed = false;
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]!;
    const target = targets[i]!;
    if (level === target) continue;
    levels[i] = level < target ? Math.min(target, level + step) : Math.max(target, level - step);
    changed = true;
  }
  return changed;
}

/**
 * Moves every tile toward its targets at a constant rate, one state (solid to liquid, say) per
 * `duration` seconds (0 snaps). Sets `moved` and `moving`; returns `moved`. Allocation-free.
 */
export function stepPhase(ease: PhaseEase, dt: number, duration: number): boolean {
  ease.moved = false;
  if (!ease.moving) return false;
  const step = duration > 0 ? dt / duration : Infinity;
  const a = approach(ease.levels, ease.targets, step);
  const b = approach(ease.unknown, ease.unknownTargets, step);
  ease.moved = a || b;
  ease.moving = false;
  for (let i = 0; i < ease.levels.length; i++)
    if (ease.levels[i] !== ease.targets[i] || ease.unknown[i] !== ease.unknownTargets[i]) {
      ease.moving = true;
      break;
    }
  return ease.moved;
}

/** How far a shown phase (0–2) is into gas, 0–1, smoothstepped: what lifts and fades a tile. */
export function gasAmount(phase: number): number {
  const g = Math.min(1, Math.max(0, phase - 1));
  return g * g * (3 - 2 * g);
}
