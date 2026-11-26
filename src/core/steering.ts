import { tileAtPoint, TILES } from './layout.ts';
import type { MoveIntent } from './input.ts';

/**
 * Pointer and touch movement, as pure maths. Three sources feed one `MoveIntent`:
 *
 * - the keyboard (`core/input.ts`), which always wins;
 * - the on-screen joystick, an analog vector whose length scales speed;
 * - a walk target set by clicking or tapping the table, steered toward in a straight line
 *   (tiles are flat and there are no obstacles) and slowed on approach so the body stops on it.
 *
 * Keyboard or joystick input cancels a walk target, so the player can always take over.
 */

export interface SteeringParams {
  /** Distance at which the walk target counts as reached, world units. */
  arriveRadius: number;
  /** Distance over which the approach slows from full speed to a stop, world units. */
  slowRadius: number;
  /** Joystick travel from centre to full deflection, px, and the dead zone as a fraction of it. */
  stickRadius: number;
  stickDeadZone: number;
}

/** Where a click or tap asked the character to go. */
export interface WalkTarget {
  active: boolean;
  x: number;
  z: number;
}

/** Joystick deflection in world x/z, length 0–1. Screen up is −z, matching the fixed camera. */
export interface Stick {
  x: number;
  z: number;
}

export function createWalkTarget(): WalkTarget {
  return { active: false, x: 0, z: 0 };
}

export function createStick(): Stick {
  return { x: 0, z: 0 };
}

/**
 * Sets the walk target from a point on the table plane. A point on a tile snaps to that tile's
 * centre (so "walk there" lands squarely on the element); a point over a gap or empty cell is
 * kept as it is. Returns the element number under the point, or null.
 */
export function setWalkTarget(t: WalkTarget, x: number, z: number): number | null {
  const number = tileAtPoint(x, z);
  const tile = number === null ? undefined : TILES[number - 1];
  t.x = tile ? tile.x : x;
  t.z = tile ? tile.z : z;
  t.active = true;
  return number;
}

export function clearWalkTarget(t: WalkTarget): void {
  t.active = false;
}

/**
 * Joystick deflection from the knob's screen offset (`dx` right, `dy` down, px). Writes into
 * `out`: length 0 inside the dead zone, rising linearly to 1 at `stickRadius`, capped there.
 */
export function stickFromOffset(dx: number, dy: number, p: SteeringParams, out: Stick): Stick {
  const r = Math.max(1, p.stickRadius);
  const len = Math.hypot(dx, dy) / r;
  const dead = Math.min(0.99, Math.max(0, p.stickDeadZone));
  if (len <= dead) {
    out.x = 0;
    out.z = 0;
    return out;
  }
  const mag = Math.min(1, (len - dead) / (1 - dead));
  out.x = (dx / r / len) * mag;
  out.z = (dy / r / len) * mag;
  return out;
}

/** Knob offset in px for drawing, clamped to the joystick's radius. Writes into `out`. */
export function clampKnob(dx: number, dy: number, radius: number, out: Stick): Stick {
  const len = Math.hypot(dx, dy);
  const k = len > radius && len > 0 ? radius / len : 1;
  out.x = dx * k;
  out.z = dy * k;
  return out;
}

/**
 * Combines the sources into `intent` for a body at (x, z). `intent` arrives holding the
 * keyboard's intent (from `moveIntent`); if it is non-zero it is kept and the walk target is
 * dropped. Otherwise a deflected joystick drives it (and drops the target), or else the active
 * walk target does. Reaching the target clears it. Returns `intent`.
 */
export function steer(
  intent: MoveIntent,
  stick: Stick,
  target: WalkTarget,
  x: number,
  z: number,
  p: SteeringParams,
): MoveIntent {
  if (intent.x !== 0 || intent.z !== 0) {
    target.active = false;
    return intent;
  }
  if (stick.x !== 0 || stick.z !== 0) {
    target.active = false;
    intent.x = stick.x;
    intent.z = stick.z;
    return intent;
  }
  if (!target.active) return intent;
  const dx = target.x - x;
  const dz = target.z - z;
  const dist = Math.hypot(dx, dz);
  if (dist <= p.arriveRadius) {
    target.active = false;
    return intent;
  }
  const speed = Math.min(1, dist / Math.max(p.slowRadius, 1e-6));
  intent.x = (dx / dist) * speed;
  intent.z = (dz / dist) * speed;
  return intent;
}

/** Longest press, ms, and largest drift, px, that still count as a tap rather than a drag. */
export const TAP_MAX_MS = 500;
export const TAP_MAX_PX = 10;

/** True when a press that lasted `ms` and drifted `px` is a tap (or a click). */
export function isTap(ms: number, px: number): boolean {
  return ms <= TAP_MAX_MS && px <= TAP_MAX_PX;
}
