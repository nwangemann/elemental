import { damp } from './damp.ts';

/**
 * Procedural body motion for the character: idle breathing and a walk cycle driven by speed.
 * Pure and allocation-free: `stepGait` advances a state object and `poseOf` writes into a pose
 * the caller reuses every frame.
 */

export interface GaitParams {
  /** Speed (world units/s) at which the walk cycle is fully blended in. */
  walkSpeed: number;
  /** Distance covered by one full cycle (two steps). The cycle follows distance, so feet don't slide. */
  strideLength: number;
  /** How fast the walk blend follows speed, 1/s. */
  blendRate: number;
  /** Breaths per second when idle. */
  breathRate: number;
  /** Peak vertical stretch while breathing, as a fraction of body height. */
  breathAmount: number;
  /** Peak body bob per step, world units. */
  bobHeight: number;
  /** Extra vertical stretch at the top of each bob, a fraction of body height. */
  stepSquash: number;
  /** Peak foot lift, world units. */
  footLift: number;
  /** Peak arm swing, radians. */
  armSwing: number;
}

export interface GaitState {
  /** Seconds since start; drives breathing. */
  time: number;
  /** Walk cycle position in [0, 1). */
  phase: number;
  /** 0 standing, 1 walking at full speed or faster. */
  blend: number;
}

export interface Pose {
  /** Body lift above its rest height. */
  bob: number;
  /** Vertical scale of the body; horizontal scale is `1 / sqrt(scaleY)` to keep volume. */
  scaleY: number;
  scaleXZ: number;
  /** Feet offsets along the facing direction (+ forward) and up. */
  leftFootForward: number;
  leftFootLift: number;
  rightFootForward: number;
  rightFootLift: number;
  /** Arm rotation about the sideways axis, radians, + forward. */
  leftArm: number;
  rightArm: number;
}

const TAU = Math.PI * 2;

export function createGait(): GaitState {
  return { time: 0, phase: 0, blend: 0 };
}

export function createPose(): Pose {
  return {
    bob: 0,
    scaleY: 1,
    scaleXZ: 1,
    leftFootForward: 0,
    leftFootLift: 0,
    rightFootForward: 0,
    rightFootLift: 0,
    leftArm: 0,
    rightArm: 0,
  };
}

/** Advances the gait by `dt` seconds at `speed` world units/s. */
export function stepGait(state: GaitState, speed: number, dt: number, p: GaitParams): void {
  const s = Math.max(0, speed);
  state.time += dt;
  state.phase = (state.phase + (s * dt) / p.strideLength) % 1;
  state.blend = damp(state.blend, Math.min(1, s / p.walkSpeed), p.blendRate, dt);
}

/** Writes the pose for the current state into `out` and returns it. */
export function poseOf(state: GaitState, p: GaitParams, out: Pose): Pose {
  const w = state.blend;
  const angle = state.phase * TAU;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  // Two bobs per cycle, one per footfall; highest mid-stride.
  const step = Math.abs(cos);
  out.bob = p.bobHeight * step * w;

  // Breathing fades out as the walk fades in; each step adds a little stretch at its peak.
  const breath = Math.sin(state.time * TAU * p.breathRate) * p.breathAmount * (1 - w);
  out.scaleY = 1 + breath + p.stepSquash * (step - 0.5) * 2 * w;
  out.scaleXZ = 1 / Math.sqrt(out.scaleY);

  // Feet swing opposite each other and lift only while moving forward.
  const reach = (p.strideLength / 4) * w;
  out.leftFootForward = reach * sin;
  out.rightFootForward = -reach * sin;
  out.leftFootLift = p.footLift * Math.max(0, cos) * w;
  out.rightFootLift = p.footLift * Math.max(0, -cos) * w;

  // Arms swing against the feet on the same side.
  out.leftArm = -p.armSwing * sin * w;
  out.rightArm = p.armSwing * sin * w;
  return out;
}
