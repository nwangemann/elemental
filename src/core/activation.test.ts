import { describe, expect, it } from 'vitest';
import {
  createActivation,
  easeLevel,
  stepActivation,
  stepActivationEra,
  stepActivationPhase,
  tileTop,
} from './activation.ts';
import { CONFIG } from './config.ts';
import { createEraEase, retargetEra, stepEra } from './discovery.ts';
import { ELEMENTS } from './elements/index.ts';
import { createPhaseEase, retargetPhase, stepPhase } from './temperature.ts';
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

describe('stepActivation with a standing tile', () => {
  it('activates nothing while the figure is not on top of a tile', () => {
    const a = createActivation();
    expect(stepActivation(a, H.x, H.z, 0.1, DURATION, 0)).toBe(false);
    expect(a.current).toBeNull();
    expect(a.levels[0]).toBe(0);
  });

  it('wakes the tile once the figure stands on it, and lets go when it leaves the top', () => {
    const a = createActivation();
    stepActivation(a, H.x, H.z, 0.1, DURATION, 0); // hopping up
    expect(stepActivation(a, H.x, H.z, 0.1, DURATION, 1)).toBe(true);
    expect(a.current).toBe(1);
    // Dropped to the ground, still within the hysteresis margin of H.
    const edge = H.z - LAYOUT.tileSize / 2 - LAYOUT.hysteresis * 0.9;
    expect(stepActivation(a, H.x, edge, 0.1, DURATION, 0)).toBe(true);
    expect(a.current).toBeNull();
  });

  it('falls back to the supporting tile just past its edge', () => {
    const a = createActivation();
    const justOff = H.z - LAYOUT.tileSize / 2 - 0.05;
    stepActivation(a, H.x, justOff, 0.1, DURATION, 1);
    expect(a.current).toBe(1);
  });
});

describe('stepActivationPhase', () => {
  it('floats gas tiles by the gas lift, marks them dirty, and tileTop follows', () => {
    const a = createActivation();
    const ease = createPhaseEase(ELEMENTS, null);
    retargetPhase(ease, ELEMENTS, 298.15);
    stepPhase(ease, 10, 0.4);
    stepActivationPhase(a, ease, 0.3);
    const o = 7; // oxygen
    expect(a.phaseLift[o]).toBeCloseTo(0.3);
    expect(a.phaseLift[25]).toBe(0); // iron
    expect(a.dirty[o]).toBe(1);
    expect(a.dirty[25]).toBe(0);
    expect(a.anyDirty).toBe(true);
    expect(tileTop(a, o)).toBeCloseTo(CONFIG.tiles.height + 0.3);
  });

  it('does nothing while the ease is still, unless placing', () => {
    const a = createActivation();
    const ease = createPhaseEase(ELEMENTS, 298.15);
    stepActivationPhase(a, ease, 0.3);
    expect(a.anyDirty).toBe(false);
    stepActivationPhase(a, ease, 0.3, true);
    expect(a.phaseLift[7]).toBeCloseTo(0.3);
  });
});

describe('stepActivationEra', () => {
  const NE = 9; // neon, 1898
  const FE = 25; // iron, antiquity

  it('sinks tiles not yet discovered by the depth, and tileTop follows', () => {
    const a = createActivation();
    const ease = createEraEase(ELEMENTS, null);
    retargetEra(ease, ELEMENTS, 1869);
    stepEra(ease, 10, 0.4);
    stepActivationEra(a, ease, 0.1, 0.3);
    expect(a.eraSink[NE]).toBeCloseTo(0.1);
    expect(a.eraSink[FE]).toBe(0);
    expect(a.dirty[NE]).toBe(1);
    expect(a.dirty[FE]).toBe(0);
    expect(tileTop(a, NE)).toBeCloseTo(CONFIG.tiles.height - 0.1);
  });

  it('places a lens present at mount, and does nothing while still', () => {
    const a = createActivation();
    const ease = createEraEase(ELEMENTS, 1869);
    stepActivationEra(a, ease, 0.1, 0.3);
    expect(a.anyDirty).toBe(false);
    stepActivationEra(a, ease, 0.1, 0.3, true);
    expect(a.eraSink[NE]).toBeCloseTo(0.1);
  });

  it('lifts a rising tile a little above its place before it settles', () => {
    const a = createActivation();
    const ease = createEraEase(ELEMENTS, 1869);
    retargetEra(ease, ELEMENTS, 1900);
    let highest = 0;
    for (let t = 0; t < 0.5; t += 1 / 60) {
      stepEra(ease, 1 / 60, 0.4);
      stepActivationEra(a, ease, 0.1, 0.3);
      highest = Math.max(highest, tileTop(a, NE));
    }
    expect(highest).toBeGreaterThan(CONFIG.tiles.height + 0.01);
    expect(tileTop(a, NE)).toBeCloseTo(CONFIG.tiles.height);
  });

  it('never puts a tile top below the floor, whatever the depth', () => {
    const a = createActivation();
    a.eraSink[NE] = 5;
    expect(tileTop(a, NE)).toBeGreaterThan(0);
  });
});
