import { describe, expect, it } from 'vitest';
import { createActivation, easeLevel, stepActivation } from './activation.ts';
import { LAYOUT, TILES } from './layout.ts';

const H = TILES[0]!;
const HE = TILES[1]!;
const DURATION = 0.25;

describe('stepActivation', () => {
  it('enters the tile under the point and ramps it up over the duration', () => {
    const a = createActivation();
    expect(stepActivation(a, H.x, H.z, 0.1, DURATION)).toBe(true);
    expect(a.current).toBe(1);
    expect(a.levels[0]).toBeCloseTo(0.4);
    expect(stepActivation(a, H.x, H.z, 0.1, DURATION)).toBe(false);
    expect(a.levels[0]).toBeCloseTo(0.8);
    stepActivation(a, H.x, H.z, 0.1, DURATION);
    expect(a.levels[0]).toBe(1);
  });

  it('marks only changing tiles dirty and goes quiet at rest', () => {
    const a = createActivation();
    stepActivation(a, H.x, H.z, 0.1, DURATION);
    expect(a.anyDirty).toBe(true);
    expect(a.dirty[0]).toBe(1);
    expect(a.dirty[1]).toBe(0);
    stepActivation(a, H.x, H.z, 1, DURATION);
    stepActivation(a, H.x, H.z, 1, DURATION);
    expect(a.anyDirty).toBe(false);
    expect(a.dirty[0]).toBe(0);
  });

  it('leaves over a gap: no current tile, the old tile ramps down', () => {
    const a = createActivation();
    stepActivation(a, H.x, H.z, 1, DURATION);
    // Far off the table's top edge: well beyond the hysteresis margin.
    expect(stepActivation(a, H.x, H.z - 2, 0.1, DURATION)).toBe(true);
    expect(a.current).toBeNull();
    expect(a.levels[0]).toBeCloseTo(0.6);
  });

  it('keeps the tile within the hysteresis margin past its edge', () => {
    const a = createActivation();
    stepActivation(a, H.x, H.z, 1, DURATION);
    const edge = H.z - LAYOUT.tileSize / 2 - LAYOUT.hysteresis * 0.9;
    expect(stepActivation(a, H.x, edge, 0.1, DURATION)).toBe(false);
    expect(a.current).toBe(1);
  });

  it('hands over between tiles: one ramps down while the other ramps up', () => {
    const a = createActivation();
    stepActivation(a, H.x, H.z, 1, DURATION);
    stepActivation(a, HE.x, HE.z, 0.05, DURATION);
    expect(a.current).toBe(2);
    expect(a.levels[0]).toBeCloseTo(0.8);
    expect(a.levels[1]).toBeCloseTo(0.2);
  });

  it('jumps straight to the target with a zero duration', () => {
    const a = createActivation();
    stepActivation(a, H.x, H.z, 0.01, 0);
    expect(a.levels[0]).toBe(1);
  });
});

describe('easeLevel', () => {
  it('maps 0 to 0, 1 to 1 and is symmetric about one half', () => {
    expect(easeLevel(0)).toBe(0);
    expect(easeLevel(1)).toBe(1);
    expect(easeLevel(0.5)).toBe(0.5);
    expect(easeLevel(0.25) + easeLevel(0.75)).toBeCloseTo(1);
  });
});
