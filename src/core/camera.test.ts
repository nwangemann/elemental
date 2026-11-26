import { describe, expect, it } from 'vitest';
import {
  cameraPose,
  createCamera,
  createPose,
  introProgress,
  skipIntro,
  snapFocus,
  stepCamera,
  zoomBy,
  zoomByFactor,
  type CameraParams,
  type CameraPose,
} from './camera.ts';
import { CONFIG_DEFAULTS } from './config.ts';

const P: CameraParams = { ...CONFIG_DEFAULTS.camera };
const OVERVIEW: CameraPose = { position: [0, 17, 15], target: [0, 0, 0] };

function run(steps: number, fn: () => void) {
  for (let i = 0; i < steps; i++) fn();
}

describe('camera', () => {
  it('starts on the overview pose', () => {
    const s = createCamera(3, -2, P);
    const pose = cameraPose(s, P, OVERVIEW, createPose());
    expect(pose).toEqual(OVERVIEW);
  });

  it('holds the overview through the delay, then eases fully into the follow pose', () => {
    const s = createCamera(0, 0, P);
    stepCamera(s, 0, 0, 0, 0, P.introDelay * 0.9, P);
    expect(introProgress(s, P)).toBe(0);
    stepCamera(s, 0, 0, 0, 0, P.introDelay * 0.1 + P.introDuration / 2, P);
    expect(introProgress(s, P)).toBeCloseTo(0.5, 5);
    stepCamera(s, 0, 0, 0, 0, P.introDuration, P);
    expect(introProgress(s, P)).toBe(1);
  });

  it('follows from behind and above at the pitch and distance', () => {
    const s = createCamera(2, -3, P);
    skipIntro(s, P);
    const { position, target } = cameraPose(s, P, OVERVIEW, createPose());
    expect(target).toEqual([2, P.focusHeight, -3]);
    const dy = position[1] - target[1];
    const dz = position[2] - target[2];
    expect(position[0]).toBe(2);
    expect(Math.hypot(dy, dz)).toBeCloseTo(P.distance, 10);
    expect((Math.atan2(dy, dz) * 180) / Math.PI).toBeCloseTo(P.pitch, 10);
  });

  it('catches up with a character that stops, and leads one that moves', () => {
    const s = createCamera(0, 0, P);
    run(240, () => stepCamera(s, 4, 0, 0, 0, 1 / 60, P));
    expect(s.focusX.value).toBeCloseTo(4, 3);
    // Walking steadily in +x: the focus settles ahead of the character by lookAhead seconds.
    const v = 2;
    let x = 4;
    run(600, () => {
      x += v / 60;
      stepCamera(s, x, 0, v, 0, 1 / 60, P);
    });
    // A critically damped spring trails a ramp by 2/omega seconds of travel (less half a frame,
    // since x moves before each step and the step holds that target still).
    const expected = x + v * P.lookAhead - (2 * v) / P.followRate + v / 120;
    expect(s.focusX.value).toBeCloseTo(expected, 3);
  });

  it('zooms in steps and pinch factors within the limits, eased', () => {
    const s = createCamera(0, 0, P);
    zoomBy(s, -1, P);
    expect(s.zoomTarget).toBeCloseTo(P.distance * Math.exp(-P.zoomStep), 10);
    expect(s.distance).toBe(P.distance);
    stepCamera(s, 0, 0, 0, 0, 1 / 60, P);
    expect(s.distance).toBeLessThan(P.distance);
    expect(s.distance).toBeGreaterThan(s.zoomTarget);
    zoomBy(s, -100, P);
    expect(s.zoomTarget).toBe(P.minDistance);
    zoomByFactor(s, 1000, P);
    expect(s.zoomTarget).toBe(P.maxDistance);
    zoomByFactor(s, 0, P);
    zoomByFactor(s, Number.NaN, P);
    expect(s.zoomTarget).toBe(P.maxDistance);
  });

  it('clamps the starting distance', () => {
    const s = createCamera(0, 0, { ...P, distance: 1000 });
    expect(s.distance).toBe(P.maxDistance);
  });

  it('holds the focus inside the given bounds while the character walks past them', () => {
    const s = createCamera(0, 0, P);
    const focus = { minX: -4, maxX: 4, minZ: -3, maxZ: 3 };
    run(600, () => stepCamera(s, 9, -7, 2.6, -2.6, 1 / 60, P, focus));
    expect(s.focusX.value).toBeCloseTo(4, 2);
    expect(s.focusZ.value).toBeCloseTo(-3, 2);
    // Inside the bounds it follows as before.
    run(600, () => stepCamera(s, 1, 2, 0, 0, 1 / 60, P, focus));
    expect(s.focusX.value).toBeCloseTo(1, 2);
    expect(s.focusZ.value).toBeCloseTo(2, 2);
  });
});

describe('snapFocus', () => {
  it('cuts the focus to a point at rest, clamped to the bounds', () => {
    const s = createCamera(0, 0, CONFIG_DEFAULTS.camera);
    s.focusX.velocity = 3;
    snapFocus(s, 5, -2);
    expect([s.focusX.value, s.focusZ.value, s.focusX.velocity, s.focusZ.velocity]).toEqual([
      5, -2, 0, 0,
    ]);
    snapFocus(s, 50, -50, { minX: -10, maxX: 10, minZ: -8, maxZ: 8 });
    expect([s.focusX.value, s.focusZ.value]).toEqual([10, -8]);
  });
});
