import { damp } from './damp.ts';
import type { MoveIntent } from './input.ts';

/**
 * Kinematic character controller on the table plane: velocity eases toward the input direction,
 * the body turns toward where it travels and leans into turns, and the position stays inside a
 * rectangle. Near the rectangle's edge a soft band slows outward travel and pushes the body back,
 * so the limit feels like a gentle slope rather than a wall. Pure and allocation-free;
 * `stepController` mutates the state it is given.
 */

export interface ControllerParams {
  /** Top walking speed, world units/s. */
  moveSpeed: number;
  /** Fraction of `moveSpeed` while Shift is held. */
  slowFactor: number;
  /** How fast velocity follows input while a key is held, 1/s. */
  accelRate: number;
  /** How fast velocity falls to zero once keys are released, 1/s. */
  decelRate: number;
  /** How fast the body turns toward its travel direction, 1/s. */
  turnRate: number;
  /** Lean per (turn rate × speed), radians per (rad/s × units/s). */
  leanAmount: number;
  /** Largest lean, radians. */
  maxLean: number;
  /** How fast the lean follows its target, 1/s. */
  leanRate: number;
  /**
   * Width of the soft band inside each bounds edge, world units. Across it the outward speed
   * allowed falls from `moveSpeed` to 0, and a push-back grows from 0 to `edgePush`.
   */
  edgeBand: number;
  /** Push back toward the inside at the very edge, units/s². */
  edgePush: number;
}

/** Axis-aligned limits for the character's centre. */
export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ControllerState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Facing, radians about +y; 0 faces +z, π/2 faces +x. */
  heading: number;
  /** Sideways tilt, radians; positive while turning toward increasing heading. */
  lean: number;
}

/** Below this speed the body keeps its heading instead of turning toward jitter. */
const TURN_MIN_SPEED = 0.05;
const TAU = Math.PI * 2;

export function createController(x: number, z: number, heading = 0): ControllerState {
  return { x, z, vx: 0, vz: 0, heading, lean: 0 };
}

/** Bounds that keep a body of `radius` inside a centred table of `width` × `depth`. */
export function tableBounds(width: number, depth: number, radius: number): Bounds {
  const hx = Math.max(0, width / 2 - radius);
  const hz = Math.max(0, depth / 2 - radius);
  return { minX: -hx, maxX: hx, minZ: -hz, maxZ: hz };
}

/** Wraps an angle to (-π, π]. */
export function wrapAngle(a: number): number {
  const w = (((a + Math.PI) % TAU) + TAU) % TAU;
  return w === 0 ? Math.PI : w - Math.PI;
}

/** Puts the body at (x, z) at rest, keeping its heading (the explorer's fly-to). */
export function teleport(s: ControllerState, x: number, z: number): void {
  s.x = x;
  s.z = z;
  s.vx = 0;
  s.vz = 0;
  s.lean = 0;
}

export function speedOf(s: ControllerState): number {
  return Math.hypot(s.vx, s.vz);
}

/** Advances the controller by `dt` seconds. */
export function stepController(
  s: ControllerState,
  intent: MoveIntent,
  dt: number,
  p: ControllerParams,
  bounds: Bounds,
): void {
  if (dt <= 0) return;
  const moving = intent.x !== 0 || intent.z !== 0;
  const top = p.moveSpeed * (intent.slow ? p.slowFactor : 1);
  const rate = moving ? p.accelRate : p.decelRate;
  s.vx = damp(s.vx, intent.x * top, rate, dt);
  s.vz = damp(s.vz, intent.z * top, rate, dt);

  s.vx = soften(s.x, s.vx, bounds.minX, bounds.maxX, dt, p);
  s.vz = soften(s.z, s.vz, bounds.minZ, bounds.maxZ, dt, p);
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  // The band should keep the body inside; the clamp is the guarantee (a teleport, a long frame).
  if (s.x < bounds.minX || s.x > bounds.maxX) {
    s.x = Math.min(bounds.maxX, Math.max(bounds.minX, s.x));
    s.vx = 0;
  }
  if (s.z < bounds.minZ || s.z > bounds.maxZ) {
    s.z = Math.min(bounds.maxZ, Math.max(bounds.minZ, s.z));
    s.vz = 0;
  }

  const speed = speedOf(s);
  const before = s.heading;
  if (speed > TURN_MIN_SPEED) {
    const delta = wrapAngle(Math.atan2(s.vx, s.vz) - s.heading);
    s.heading = wrapAngle(s.heading + delta * (1 - Math.exp(-p.turnRate * dt)));
  }
  const omega = wrapAngle(s.heading - before) / dt;
  const target = Math.max(-p.maxLean, Math.min(p.maxLean, p.leanAmount * omega * speed));
  s.lean = damp(s.lean, target, p.leanRate, dt);
}

/**
 * One axis of the soft edge: how deep `pos` is into the band at either limit (0 at the band's
 * inner side, 1 at the limit) caps the outward velocity at `moveSpeed × (1 − depth)` and adds a
 * push of `edgePush × depth` back inside. Returns the new velocity.
 */
function soften(pos: number, v: number, min: number, max: number, dt: number, p: ControllerParams) {
  const band = Math.min(p.edgeBand, (max - min) / 2);
  if (!(band > 0)) return v;
  const hi = Math.min(1, Math.max(0, (pos - (max - band)) / band));
  const lo = Math.min(1, Math.max(0, (min + band - pos) / band));
  if (hi > 0) {
    v = Math.min(v, p.moveSpeed * (1 - hi)) - p.edgePush * hi * dt;
  } else if (lo > 0) {
    v = Math.max(v, -p.moveSpeed * (1 - lo)) + p.edgePush * lo * dt;
  }
  return v;
}
