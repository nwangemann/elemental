import type { Bounds } from './controller.ts';
import { stepSpring, damp, type Spring } from './damp.ts';

/**
 * The third-person camera as pure maths: a focus point that follows the character on critically
 * damped springs (with a little look-ahead along its velocity), a zoom distance eased toward a
 * clamped target, and an establishing shot that blends from the overview pose into the follow
 * pose. The focus is held inside given bounds, so walking out to the outer limit keeps the table
 * in frame. The camera keeps a fixed heading (looking toward −z), so keyboard directions stay
 * screen-relative. Allocation-free; the step and pose functions write into objects they are given.
 */

export interface CameraParams {
  /** Spring frequency of the follow, 1/s. Settles in about 4/followRate seconds. */
  followRate: number;
  /** Seconds of velocity added to the focus point, so the view leads the walk a little. */
  lookAhead: number;
  /** Height of the focus point above the ground, world units. */
  focusHeight: number;
  /** How far past the table's footprint the focus may go, world units (see `focusBounds`). */
  focusMargin: number;
  /** Angle of the view above the horizon, degrees. */
  pitch: number;
  /** Starting distance from the focus point, and its limits. */
  distance: number;
  minDistance: number;
  maxDistance: number;
  /** Zoom per key press or 100 px of wheel, as a natural-log step of the distance. */
  zoomStep: number;
  /** How fast the distance follows its zoom target, 1/s. */
  zoomRate: number;
  /** Seconds on the overview before the establishing shot moves, and how long the move takes. */
  introDelay: number;
  introDuration: number;
}

export interface CameraState {
  focusX: Spring;
  focusZ: Spring;
  distance: number;
  zoomTarget: number;
  /** Seconds since the intro started. */
  introTime: number;
}

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export function createCamera(x: number, z: number, p: CameraParams): CameraState {
  const d = clamp(p.distance, p.minDistance, p.maxDistance);
  return {
    focusX: { value: x, velocity: 0 },
    focusZ: { value: z, velocity: 0 },
    distance: d,
    zoomTarget: d,
    introTime: 0,
  };
}

export function createPose(): CameraPose {
  return { position: [0, 0, 0], target: [0, 0, 0] };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Zooms by `steps` (positive = out, negative = in); 1 step is one key press. Clamped. */
export function zoomBy(s: CameraState, steps: number, p: CameraParams): void {
  zoomByFactor(s, Math.exp(steps * p.zoomStep), p);
}

/** Multiplies the zoom distance by `factor` (a pinch's finger-spread ratio, inverted). Clamped. */
export function zoomByFactor(s: CameraState, factor: number, p: CameraParams): void {
  if (!(factor > 0)) return;
  s.zoomTarget = clamp(s.zoomTarget * factor, p.minDistance, p.maxDistance);
}

/** Ends the establishing shot at once (reduced motion, or a later skip). */
export function skipIntro(s: CameraState, p: CameraParams): void {
  s.introTime = Math.max(s.introTime, p.introDelay + p.introDuration);
}

/**
 * Puts the follow focus on (x, z) at once, at rest, clamped to `focus`: a cut instead of a glide,
 * used for fly-to under reduced motion.
 */
export function snapFocus(s: CameraState, x: number, z: number, focus?: Readonly<Bounds>): void {
  s.focusX.value = focus ? clamp(x, focus.minX, focus.maxX) : x;
  s.focusZ.value = focus ? clamp(z, focus.minZ, focus.maxZ) : z;
  s.focusX.velocity = 0;
  s.focusZ.velocity = 0;
}

/** How far the establishing shot has gone, 0 (overview) to 1 (following), eased in and out. */
export function introProgress(s: CameraState, p: CameraParams): number {
  if (p.introDuration <= 0) return s.introTime >= p.introDelay ? 1 : 0;
  const t = clamp((s.introTime - p.introDelay) / p.introDuration, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Advances follow, zoom and intro by `dt` seconds toward a character at (x, z) moving (vx, vz).
 * The spring's goal (position plus look-ahead) is clamped to `focus`, so the view stops at the
 * edge while the character walks on into the margin.
 */
export function stepCamera(
  s: CameraState,
  x: number,
  z: number,
  vx: number,
  vz: number,
  dt: number,
  p: CameraParams,
  focus?: Readonly<Bounds>,
): void {
  if (dt <= 0) return;
  let gx = x + vx * p.lookAhead;
  let gz = z + vz * p.lookAhead;
  if (focus) {
    gx = clamp(gx, focus.minX, focus.maxX);
    gz = clamp(gz, focus.minZ, focus.maxZ);
  }
  stepSpring(s.focusX, gx, p.followRate, dt);
  stepSpring(s.focusZ, gz, p.followRate, dt);
  s.zoomTarget = clamp(s.zoomTarget, p.minDistance, p.maxDistance);
  s.distance = damp(s.distance, s.zoomTarget, p.zoomRate, dt);
  s.introTime += dt;
}

/**
 * Writes the camera pose into `out`: the follow pose (behind the focus point at `pitch`, looking
 * toward −z), blended from the `overview` pose by the intro's progress.
 */
export function cameraPose(
  s: CameraState,
  p: CameraParams,
  overview: Readonly<CameraPose>,
  out: CameraPose,
): CameraPose {
  const a = (p.pitch * Math.PI) / 180;
  const tx = s.focusX.value;
  const ty = p.focusHeight;
  const tz = s.focusZ.value;
  const px = tx;
  const py = ty + Math.sin(a) * s.distance;
  const pz = tz + Math.cos(a) * s.distance;
  const k = introProgress(s, p);
  const op = overview.position;
  const ot = overview.target;
  out.position[0] = op[0] + (px - op[0]) * k;
  out.position[1] = op[1] + (py - op[1]) * k;
  out.position[2] = op[2] + (pz - op[2]) * k;
  out.target[0] = ot[0] + (tx - ot[0]) * k;
  out.target[1] = ot[1] + (ty - ot[1]) * k;
  out.target[2] = ot[2] + (tz - ot[2]) * k;
  return out;
}
