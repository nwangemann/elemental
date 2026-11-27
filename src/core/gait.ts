import { damp } from './damp.ts';

/**
 * Procedural body motion for the character: idle breathing, a walk cycle driven by speed, and
 * two arm gestures layered over it: holding a formed compound aloft (both hands up over the
 * head in a narrow V) and throwing the arms up and out while hopping or falling. Pure and
 * allocation-free: `stepGait` and `stepArms` advance a state object and `poseOf` writes into a
 * pose the caller reuses every frame.
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
  /** Holding aloft: arms raised this far from hanging (radians, π is straight up) and spread out. */
  holdRaise: number;
  holdOut: number;
  /** How far the shoulders ride up the body with the arms fully raised, world units. */
  armReach: number;
  /** How fast the hold blend follows, 1/s. */
  holdRate: number;
  /** In the air: arms raised this far and spread out, radians. */
  airRaise: number;
  airOut: number;
  /** How fast the air blend rises on take-off and settles after landing, 1/s. */
  airRiseRate: number;
  airSettleRate: number;
}

export interface GaitState {
  /** Seconds since start; drives breathing. */
  time: number;
  /** Walk cycle position in [0, 1). */
  phase: number;
  /** 0 standing, 1 walking at full speed or faster. */
  blend: number;
  /** 0 arms free, 1 holding a formed compound overhead. */
  hold: number;
  /** 0 on the ground, 1 arms up for a hop or a fall. */
  air: number;
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
  /** Arm rotation away from the body (about the forward axis), radians, + outward on each side. */
  leftArmOut: number;
  rightArmOut: number;
  /** How far the shoulders ride up while the arms are raised, so raised hands clear the head. */
  shoulderLift: number;
}

const TAU = Math.PI * 2;

export function createGait(): GaitState {
  return { time: 0, phase: 0, blend: 0, hold: 0, air: 0 };
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
    leftArmOut: 0,
    rightArmOut: 0,
    shoulderLift: 0,
  };
}

/** Advances the gait by `dt` seconds at `speed` world units/s. */
export function stepGait(state: GaitState, speed: number, dt: number, p: GaitParams): void {
  const s = Math.max(0, speed);
  state.time += dt;
  state.phase = (state.phase + (s * dt) / p.strideLength) % 1;
  state.blend = damp(state.blend, Math.min(1, s / p.walkSpeed), p.blendRate, dt);
}

/**
 * Eases the arm gestures toward what is happening: `holding` while a formed compound floats
 * overhead, and `air` (0–1, `airLift` in `core/ledge.ts`) while hopping or falling: 1 for a
 * fall or a full hop, less for a micro-hop. The air blend rises fast, so even a short hop
 * shows the arms up, and settles more slowly after landing.
 */
export function stepArms(
  state: GaitState,
  holding: boolean,
  air: number,
  dt: number,
  p: GaitParams,
): void {
  state.hold = damp(state.hold, holding ? 1 : 0, p.holdRate, dt);
  state.air = damp(state.air, air, air > state.air ? p.airRiseRate : p.airSettleRate, dt);
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

  // Arms swing against the feet on the same side, less the more a gesture takes them over.
  // Holding wins over the air gesture, so a hop with a compound overhead keeps it held.
  const hold = state.hold;
  const air = state.air * (1 - hold);
  const swing = p.armSwing * sin * w * (1 - hold - air);
  const raise = -(p.holdRaise * hold + p.airRaise * air);
  const spread = p.holdOut * hold + p.airOut * air;
  out.leftArm = raise - swing;
  out.rightArm = raise + swing;
  out.leftArmOut = spread;
  out.rightArmOut = spread;
  out.shoulderLift = p.armReach * (hold + air * (p.airRaise / Math.PI));
  return out;
}
