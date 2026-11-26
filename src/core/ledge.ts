import { GROUND } from './boundary.ts';
import { damp } from './damp.ts';

/**
 * The character's height above the ground, and the drops and hops between tiles and ground
 * (ADR 0009). Pure and allocation-free; the scene feeds it what is under the body each frame
 * (`surfaceAt`) and the height of that surface.
 *
 * - **Stand:** the feet follow the surface's height, smoothed, so a tile rising underneath is
 *   ridden and stepping between a raised tile and a resting one dips gently.
 * - **Fall:** leaving a tile for the ground drops under gravity, easing in like a real fall.
 * - **Hop:** moving from the ground onto a tile (by walking, a walk target or a fly-to) hops up
 *   on a short arc that ends on the tile top.
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
  /** Seconds into the current hop, and the height it started from. */
  hopTime: number;
  hopFrom: number;
  /** Current landing squash, 0 at rest. */
  squash: number;
}

/** Below this, a drop is just the stand smoothing (so a body on the ground never "falls" 0). */
const FALL_EPSILON = 0.005;

export function createLedge(y: number, on: number): LedgeState {
  return { y, vy: 0, mode: LEDGE_STAND, on, hopTime: 0, hopFrom: y, squash: 0 };
}

function startFall(s: LedgeState): void {
  s.mode = LEDGE_FALL;
  s.on = GROUND;
  s.vy = 0;
}

function startHop(s: LedgeState, onto: number): void {
  s.mode = LEDGE_HOP;
  s.on = onto;
  s.hopTime = 0;
  s.hopFrom = s.y;
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
 */
export function stepLedge(
  s: LedgeState,
  support: number,
  floor: number,
  dt: number,
  p: LedgeParams,
): void {
  s.squash = damp(s.squash, 0, p.squashRecover, dt);

  if (s.mode === LEDGE_STAND) {
    if (support === GROUND && s.on !== GROUND) {
      if (s.y > floor + FALL_EPSILON) startFall(s);
      else s.on = GROUND;
    } else if (support !== GROUND && s.on === GROUND) {
      startHop(s, support);
    } else {
      s.on = support;
    }
  }

  if (s.mode === LEDGE_FALL) {
    if (support !== GROUND) {
      // Back over a tile mid-fall (only possible at its edge): hop onto it from here.
      startHop(s, support);
    } else {
      fallStep(s, floor, dt, p);
      return;
    }
  }

  if (s.mode === LEDGE_HOP) {
    if (support === GROUND) {
      // Moved back off before landing: fall from wherever the arc had got to.
      startFall(s);
      fallStep(s, floor, dt, p);
      return;
    }
    s.on = support;
    s.hopTime += dt;
    const t = p.hopDuration > 0 ? Math.min(1, s.hopTime / p.hopDuration) : 1;
    s.y = hopHeightAt(s.hopFrom, floor, t, p.hopHeight);
    if (t >= 1) land(s, floor, p);
    return;
  }

  s.y = damp(s.y, floor, p.standRate, dt);
}

/** True while falling or hopping. */
export function isAirborne(s: LedgeState): boolean {
  return s.mode !== LEDGE_STAND;
}

/** The tile the body stands on top of, or `GROUND` while on the ground, falling or hopping. */
export function standingOn(s: LedgeState): number {
  return s.mode === LEDGE_STAND ? s.on : GROUND;
}
