// Where combine mode's carried atoms float (ADR 20): one stack per element on a shallow
// curve behind the figure, oldest element on the figure's left, each stack in columns of
// `rows` atoms so 24 hydrogens stay low. Positions are in the figure's frame (it faces +z).
import { wrapAngle } from './controller.ts';
import { damp } from './damp.ts';

export interface OrbParams {
  /** Distance behind the figure's centre, at the middle of the curve. */
  orbDistance: number;
  /** How far the curve bends forward toward its ends: z grows by `orbCurve · x²`. */
  orbCurve: number;
  /** Height of the lowest row above the figure's feet. */
  orbLift: number;
  /** Centre-to-centre distance between neighbouring orbs. */
  orbSpacing: number;
  /** Gap between stacks, beyond one spacing. */
  orbGap: number;
  /** Atoms per column before a stack starts another column. */
  orbRows: number;
}

/**
 * Writes x, y, z for every atom, stack by stack in `counts` order, into `out` (3 floats per
 * atom) and returns how many atoms it placed. Allocation-free, for use on a carry change.
 */
export function orbSlots(counts: readonly number[], p: OrbParams, out: Float32Array): number {
  const rows = Math.max(1, Math.floor(p.orbRows));
  let width = 0;
  for (const n of counts) width += Math.ceil(n / rows) * p.orbSpacing;
  width += Math.max(0, counts.length - 1) * p.orbGap;
  // The figure faces +z, so its left is +x: start there and move toward its right (−x).
  let cursor = width / 2;
  let k = 0;
  for (const n of counts) {
    for (let j = 0; j < n; j++) {
      const x = cursor - (Math.floor(j / rows) + 0.5) * p.orbSpacing;
      out[k * 3] = x;
      out[k * 3 + 1] = p.orbLift + (j % rows) * p.orbSpacing;
      out[k * 3 + 2] = -p.orbDistance + p.orbCurve * x * x;
      k++;
    }
    cursor -= Math.ceil(n / rows) * p.orbSpacing + p.orbGap;
  }
  return k;
}

/** Where the orbs' group is, easing after the figure; `moving` keeps frames coming. */
export interface OrbFollow {
  x: number;
  y: number;
  z: number;
  heading: number;
  moving: boolean;
}

const STILL = 1e-3;

export function createOrbFollow(x: number, y: number, z: number, heading: number): OrbFollow {
  return { x, y, z, heading, moving: false };
}

/** Puts the orbs on the figure at once (while hidden, so they appear beside it). */
export function snapOrbFollow(f: OrbFollow, x: number, y: number, z: number, heading: number) {
  f.x = x;
  f.y = y;
  f.z = z;
  f.heading = heading;
  f.moving = false;
}

/**
 * Eases the orbs toward the figure's position and heading at `rate` (1/s; height twice as
 * fast, so they ride up a hop), and sets `moving` while they are still catching up.
 */
export function stepOrbFollow(
  f: OrbFollow,
  x: number,
  y: number,
  z: number,
  heading: number,
  rate: number,
  dt: number,
): void {
  const turn = wrapAngle(heading - f.heading);
  f.moving =
    Math.abs(x - f.x) + Math.abs(z - f.z) > STILL ||
    Math.abs(turn) > STILL ||
    Math.abs(y - f.y) > STILL;
  f.x = damp(f.x, x, rate, dt);
  f.y = damp(f.y, y, rate * 2, dt);
  f.z = damp(f.z, z, rate, dt);
  f.heading = wrapAngle(f.heading + damp(0, turn, rate, dt));
}
