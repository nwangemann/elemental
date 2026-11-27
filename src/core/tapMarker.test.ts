import { describe, expect, it } from 'vitest';
import { createWalkTarget, setWalkTarget } from './steering.ts';
import {
  PULSE_GROWTH,
  createTapMarker,
  placeTapMarker,
  stepTapMarker,
  tapMarkerLook,
  type MarkerLook,
} from './tapMarker.ts';

const params = { markerPulse: 0.4, markerOpacity: 0.5 };
const look = (): MarkerLook => ({ scale: 0, opacity: 0 });

describe('tap marker', () => {
  it('starts on the target it marks', () => {
    const target = createWalkTarget();
    setWalkTarget(target, 3, 4);
    const m = createTapMarker();
    placeTapMarker(m, target, 7);
    expect(m).toEqual({ live: true, x: target.x, z: target.z, tile: 7, age: 0 });
  });

  it('is not live when the tap set no active target', () => {
    const m = createTapMarker();
    placeTapMarker(m, createWalkTarget(), -1);
    expect(m.live).toBe(false);
    expect(stepTapMarker(m, createWalkTarget(), 0.1)).toBe(false);
  });

  it('ages while its target is active and ends on arrival', () => {
    const target = createWalkTarget();
    setWalkTarget(target, 3, 4);
    const m = createTapMarker();
    placeTapMarker(m, target, 7);
    expect(stepTapMarker(m, target, 0.1)).toBe(true);
    expect(m.age).toBeCloseTo(0.1);
    target.active = false;
    expect(stepTapMarker(m, target, 0.1)).toBe(false);
    expect(m.live).toBe(false);
  });

  it('ends when something else moves the walk target', () => {
    const target = createWalkTarget();
    setWalkTarget(target, 3, 4);
    const m = createTapMarker();
    placeTapMarker(m, target, 7);
    target.x += 1;
    expect(stepTapMarker(m, target, 0.1)).toBe(false);
  });

  it('pulses from larger and brighter down to its held look', () => {
    expect(tapMarkerLook(0, params, false, look())).toEqual({
      scale: 1 + PULSE_GROWTH,
      opacity: 1,
    });
    const mid = tapMarkerLook(0.2, params, false, look());
    expect(mid.scale).toBeGreaterThan(1);
    expect(mid.scale).toBeLessThan(1 + PULSE_GROWTH);
    expect(mid.opacity).toBeGreaterThan(0.5);
    expect(mid.opacity).toBeLessThan(1);
    expect(tapMarkerLook(5, params, false, look())).toEqual({ scale: 1, opacity: 0.5 });
  });

  it('keeps its size under reduced motion', () => {
    expect(tapMarkerLook(0, params, true, look()).scale).toBe(1);
    expect(tapMarkerLook(0, params, true, look()).opacity).toBe(1);
    expect(tapMarkerLook(5, params, true, look())).toEqual({ scale: 1, opacity: 0.5 });
  });

  it('skips the pulse when its length is zero', () => {
    expect(tapMarkerLook(0, { ...params, markerPulse: 0 }, false, look())).toEqual({
      scale: 1,
      opacity: 0.5,
    });
  });
});
