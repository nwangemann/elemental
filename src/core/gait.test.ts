import { describe, expect, it } from 'vitest';
import { CONFIG_DEFAULTS } from './config.ts';
import { createGait, createPose, poseOf, stepArms, stepGait, type GaitParams } from './gait.ts';

const P: GaitParams = CONFIG_DEFAULTS.character;

function run(speed: number, seconds: number, fps = 60) {
  const g = createGait();
  for (let i = 0; i < seconds * fps; i++) stepGait(g, speed, 1 / fps, P);
  return g;
}

describe('gait', () => {
  it('stays put and breathes when standing', () => {
    const g = run(0, 3);
    expect(g.phase).toBe(0);
    expect(g.blend).toBe(0);
    const pose = poseOf(g, P, createPose());
    expect(pose.bob).toBe(0);
    expect(pose.leftFootLift).toBe(0);
    expect(pose.leftArm).toBe(-0);
    expect(Math.abs(pose.scaleY - 1)).toBeLessThanOrEqual(P.breathAmount);
  });

  it('blends the walk in with speed', () => {
    expect(run(P.walkSpeed / 2, 3).blend).toBeCloseTo(0.5, 2);
    expect(run(P.walkSpeed * 3, 3).blend).toBeCloseTo(1, 2);
  });

  it('advances one cycle per stride length travelled', () => {
    const g = createGait();
    stepGait(g, P.strideLength / 4, 1, P);
    expect(g.phase).toBeCloseTo(0.25);
    stepGait(g, P.strideLength, 1, P);
    expect(g.phase).toBeCloseTo(0.25);
  });

  it('does not depend on frame rate', () => {
    const a = run(P.walkSpeed, 2, 30);
    const b = run(P.walkSpeed, 2, 144);
    expect(a.phase).toBeCloseTo(b.phase, 6);
    expect(a.blend).toBeCloseTo(b.blend, 6);
  });

  it('moves the feet in opposition and keeps volume', () => {
    const g = run(P.walkSpeed, 3);
    g.phase = 0.25;
    const pose = poseOf(g, P, createPose());
    expect(pose.leftFootForward).toBeCloseTo(-pose.rightFootForward);
    expect(pose.leftFootForward).toBeGreaterThan(0);
    expect(pose.leftArm).toBeLessThan(0);
    expect(pose.scaleY * pose.scaleXZ ** 2).toBeCloseTo(1);
  });

  it('lifts one foot at a time', () => {
    const g = run(P.walkSpeed, 3);
    for (const phase of [0, 0.1, 0.3, 0.5, 0.7, 0.9]) {
      g.phase = phase;
      const pose = poseOf(g, P, createPose());
      expect(Math.min(pose.leftFootLift, pose.rightFootLift)).toBe(0);
    }
  });

  it('reuses the output object', () => {
    const out = createPose();
    expect(poseOf(createGait(), P, out)).toBe(out);
  });

  it('raises both arms over the head in a V, shoulders up, while holding a compound', () => {
    const g = run(0, 1);
    for (let i = 0; i < 60; i++) stepArms(g, true, 0, 1 / 60, P);
    expect(g.hold).toBeGreaterThan(0.99);
    const pose = poseOf(g, P, createPose());
    expect(pose.leftArm).toBeCloseTo(-P.holdRaise, 1);
    expect(pose.rightArm).toBeCloseTo(-P.holdRaise, 1);
    expect(pose.leftArmOut).toBeCloseTo(P.holdOut, 1);
    expect(pose.shoulderLift).toBeCloseTo(P.armReach, 2);
  });

  it('keeps held arms still while walking', () => {
    const g = run(P.walkSpeed, 1);
    for (let i = 0; i < 120; i++) stepArms(g, true, 0, 1 / 60, P);
    const pose = poseOf(g, P, createPose());
    expect(Math.abs(pose.leftArm - pose.rightArm)).toBeLessThan(0.01);
  });

  it('throws the arms up and out within a short hop, and settles after', () => {
    const g = createGait();
    const hop = CONFIG_DEFAULTS.character.hopDuration;
    for (let t = 0; t < hop / 2; t += 1 / 60) stepArms(g, false, 1, 1 / 60, P);
    expect(g.air).toBeGreaterThan(0.9);
    const up = poseOf(g, P, createPose());
    expect(up.leftArm).toBeLessThan(-P.airRaise * 0.9);
    expect(up.leftArmOut).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) stepArms(g, false, 0, 1 / 60, P);
    expect(g.air).toBeLessThan(0.01);
  });

  it('keeps holding through a hop', () => {
    const g = createGait();
    for (let i = 0; i < 120; i++) stepArms(g, true, 1, 1 / 60, P);
    const pose = poseOf(g, P, createPose());
    expect(pose.leftArm).toBeCloseTo(-P.holdRaise, 1);
    expect(pose.leftArmOut).toBeCloseTo(P.holdOut, 1);
  });

  it('lifts the arms only part way for a small hop', () => {
    const g = createGait();
    for (let i = 0; i < 30; i++) stepArms(g, false, 0.4, 1 / 60, P);
    expect(g.air).toBeCloseTo(0.4, 2);
  });
});
