import { GROUND } from './boundary.ts';
import { damp } from './damp.ts';

/**
 * The character's height above the ground, and the drops and hops between tiles and ground
 * (ADR 0009). Pure and allocation-free; the scene feeds it what is under the body each frame
 * (`surfaceAt`) and the height of that surface.
 *
 * - **Stand:** the feet follow the surface's height, smoothed, so a tile rising underneath is
 *   ridden and a step down between tiles no taller than `stepGlide` (a raised tile and a resting
 *   one) dips gently.
 * - **Micro-hop:** a tile-to-tile move inside `stepGlide` whose step up, as the lenses built it
 *   (`rise`, which leaves out the wake rise of the tile being left), is taller than `microStep`
 *   gets a small, quick hop (`microHopHeight`, `microHopDuration`), so walking over a lens
 *   landscape steps onto each tile instead of sliding up. Lower steps still glide.
 * - **Fall:** leaving a tile for the ground, or for a tile more than `stepGlide` lower, drops
 *   under gravity, easing in like a real fall.
 * - **Hop:** moving from the ground onto a tile, or onto a tile more than `stepGlide` higher (by
 *   walking, a walk target or a fly-to), hops up on an arc that ends on the tile top. Steps up to
 *   `hopStep` get the base hop; taller ones scale its apex with the step and its length with the
 *   square root, so a bigger climb is a bigger, slower jump (ADR 0014).
 *
 * Which steps may be climbed at all is not decided here: `core/climb.ts` stops walking at a cliff
 * before the body gets over it.
 *
 * Landing from either squashes the body a little, recovering over a moment.
 */

export const LEDGE_STAND = 0;
export const LEDGE_FALL = 1;
export const LEDGE_HOP = 2;
export type LedgeMode = typeof LEDGE_STAND | typeof LEDGE_FALL | typeof LEDGE_HOP;

export interface LedgeParams {
  /** Smoothing of the standing height toward the surface, 1/s. */
  standRate: number;
  /** Fall acceleration, units/s². */
  gravity: number;
  /** Apex of a hop above the straight line from start to tile top, and its duration, s. */
  hopHeight: number;
  hopDuration: number;
  /** Largest step that gets the base hop; taller steps scale it (see `hopShape`). */
  hopStep: number;
  /** Tile-to-tile steps up to this height are smoothed (down) or micro-hopped (up), not fallen. */
  stepGlide: number;
  /** Steps up between tiles taller than this get a micro-hop: its apex and length, s. */
  microStep: number;
  microHopHeight: number;
  microHopDuration: number;
  /** Body squash on landing (fraction of height) and how fast it recovers, 1/s. */
  landSquash: number;
  squashRecover: number;
}

export interface LedgeState {
  /** Height of the feet above the ground. */
  y: number;
  /** Vertical velocity while falling, units/s. */
  vy: number;
  mode: LedgeMode;
  /** What the body stands on or is hopping onto: a tile number or `GROUND`. */
  on: number;
  /** Seconds into the current hop, the height it started from, its apex and its length, s. */
  hopTime: number;
  hopFrom: number;
  hopApex: number;
  hopLength: number;
  /** Current landing squash, 0 at rest. */
  squash: number;
}

/** Below this, a drop is just the stand smoothing (so a body on the ground never "falls" 0). */
const FALL_EPSILON = 0.005;

export function createLedge(y: number, on: number): LedgeState {
  return {
    y,
    vy: 0,
    mode: LEDGE_STAND,
    on,
    hopTime: 0,
    hopFrom: y,
    hopApex: 0,
    hopLength: 0,
    squash: 0,
  };
}

/** How much bigger than the base hop a climb of `step` is: 1 up to `hopStep`, then in proportion. */
export function hopScale(step: number, p: LedgeParams): number {
  return p.hopStep > 0 ? Math.max(1, step / p.hopStep) : 1;
}

function startMicroHop(s: LedgeState, onto: number, p: LedgeParams): void {
  s.mode = LEDGE_HOP;
  s.on = onto;
  s.hopTime = 0;
  s.hopFrom = s.y;
  s.hopApex = p.microHopHeight;
  s.hopLength = p.microHopDuration;
  s.vy = 0;
}

function startFall(s: LedgeState, onto: number): void {
  s.mode = LEDGE_FALL;
  s.on = onto;
  s.vy = 0;
}

function startHop(s: LedgeState, onto: number, floor: number, p: LedgeParams): void {
  const k = hopScale(floor - s.y, p);
  s.mode = LEDGE_HOP;
  s.on = onto;
  s.hopTime = 0;
  s.hopFrom = s.y;
  s.hopApex = p.hopHeight * k;
  s.hopLength = p.hopDuration * Math.sqrt(k);
  s.vy = 0;
}

function land(s: LedgeState, floor: number, p: LedgeParams): void {
  s.mode = LEDGE_STAND;
  s.y = floor;
  s.vy = 0;
  s.squash = p.landSquash;
}

function fallStep(s: LedgeState, floor: number, dt: number, p: LedgeParams): void {
  s.vy -= p.gravity * dt;
  s.y += s.vy * dt;
  if (s.y <= floor) land(s, floor, p);
}

/** Height along a hop at fraction t (0–1): a straight rise plus a parabolic arc. */
export function hopHeightAt(from: number, to: number, t: number, apex: number): number {
  return from + (to - from) * t + 4 * apex * t * (1 - t);
}

/**
 * Advances the vertical state by `dt`. `support` is what is under the body this frame
 * (`surfaceAt`) and `floor` that surface's current height (a tile's top with its rise, or 0).
 * `rise` is how much higher `support` stands than the tile being left, not counting wake rises;
 * it decides micro-hops and defaults to the plain height difference.
 */
export function stepLedge(
  s: LedgeState,
  support: number,
  floor: number,
  dt: number,
  p: LedgeParams,
  rise: number = floor - s.y,
): void {
  s.squash = damp(s.squash, 0, p.squashRecover, dt);

  if (s.mode === LEDGE_STAND && support !== s.on) {
    if (support === GROUND) {
      if (s.y > floor + FALL_EPSILON) startFall(s, GROUND);
      else s.on = GROUND;
    } else if (s.on === GROUND || floor > s.y + p.stepGlide) {
      startHop(s, support, floor, p);
    } else if (floor < s.y - p.stepGlide) {
      startFall(s, support);
    } else if (rise > p.microStep) {
      startMicroHop(s, support, p);
    } else {
      s.on = support;
    }
  }

  if (s.mode === LEDGE_FALL) {
    if (floor > s.y) {
      // Back over a higher surface mid-fall (only possible at its edge): hop onto it from here.
      startHop(s, support, floor, p);
    } else {
      s.on = support;
      fallStep(s, floor, dt, p);
      return;
    }
  }

  if (s.mode === LEDGE_HOP) {
    if (support !== s.on && (support === GROUND || floor < s.y)) {
      // Moved off before landing, onto something lower: fall from wherever the arc had got to.
      startFall(s, support);
      fallStep(s, floor, dt, p);
      return;
    }
    s.on = support;
    s.hopTime += dt;
    const t = s.hopLength > 0 ? Math.min(1, s.hopTime / s.hopLength) : 1;
    s.y = hopHeightAt(s.hopFrom, floor, t, s.hopApex);
    if (t >= 1) land(s, floor, p);
    return;
  }

  s.y = damp(s.y, floor, p.standRate, dt);
}

/**
 * How far the arms go up for what the body is doing, 0–1: all the way for a fall or a full hop,
 * in proportion to the apex for a smaller one (a micro-hop), 0 standing.
 */
export function airLift(s: LedgeState, p: LedgeParams): number {
  if (s.mode === LEDGE_FALL) return 1;
  if (s.mode === LEDGE_STAND) return 0;
  return p.hopHeight > 0 ? Math.min(1, s.hopApex / p.hopHeight) : 1;
}

/** True while falling or hopping. */
export function isAirborne(s: LedgeState): boolean {
  return s.mode !== LEDGE_STAND;
}

/** The tile the body stands on top of, or `GROUND` while on the ground, falling or hopping. */
export function standingOn(s: LedgeState): number {
  return s.mode === LEDGE_STAND ? s.on : GROUND;
}
