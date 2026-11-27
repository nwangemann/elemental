import { describe, expect, it } from 'vitest';
import { GROUND } from './boundary.ts';
import { CONFIG_DEFAULTS } from './config.ts';
import {
  createLedge,
  hopHeightAt,
  hopScale,
  isAirborne,
  LEDGE_FALL,
  LEDGE_HOP,
  LEDGE_STAND,
  standingOn,
  stepLedge,
} from './ledge.ts';

const P = CONFIG_DEFAULTS.character;
const TOP = 0.18;
const DT = 1 / 60;

/** Steps until the ledge stands again (or `max` seconds), returning heights seen on the way. */
function run(s: ReturnType<typeof createLedge>, support: number, floor: number, max = 2) {
  const ys: number[] = [];
  for (let t = 0; t < max; t += DT) {
    stepLedge(s, support, floor, DT, P);
    ys.push(s.y);
    if (s.mode === LEDGE_STAND) break;
  }
  return ys;
}

describe('stepLedge', () => {
  it('rides a tile rising underneath without leaving stand', () => {
    const s = createLedge(TOP, 1);
    for (let i = 0; i < 30; i++) stepLedge(s, 1, TOP + (0.1 * i) / 29, DT, P);
    for (let i = 0; i < 30; i++) stepLedge(s, 1, TOP + 0.1, DT, P);
    expect(s.mode).toBe(LEDGE_STAND);
    expect(s.y).toBeCloseTo(TOP + 0.1, 3);
    expect(standingOn(s)).toBe(1);
  });

  it('steps between tiles of different heights by smoothing, not falling', () => {
    const s = createLedge(TOP + 0.1, 1);
    stepLedge(s, 2, TOP, DT, P);
    expect(s.mode).toBe(LEDGE_STAND);
    expect(standingOn(s)).toBe(2);
  });

  it('drops off a tile with an eased fall and lands with a squash', () => {
    const s = createLedge(TOP, 1);
    stepLedge(s, GROUND, 0, DT, P);
    expect(s.mode).toBe(LEDGE_FALL);
    expect(isAirborne(s)).toBe(true);
    expect(standingOn(s)).toBe(GROUND);
    const ys = [TOP, s.y, ...run(s, GROUND, 0)];
    // Gravity: each frame's drop is larger than the last (eases in), never below the ground.
    const drops = ys.slice(1).map((y, i) => ys[i]! - y);
    expect(drops[1]!).toBeGreaterThan(drops[0]!);
    expect(Math.min(...ys)).toBe(0);
    expect(s.mode).toBe(LEDGE_STAND);
    expect(s.y).toBe(0);
    expect(s.squash).toBeGreaterThan(0);
    // A 0.18 drop takes a moment, not an instant.
    expect(ys.length * DT).toBeGreaterThan(0.1);
  });

  it('hops from the ground onto a tile over hopDuration, above both ends', () => {
    const s = createLedge(0, GROUND);
    stepLedge(s, 5, TOP, DT, P);
    expect(s.mode).toBe(LEDGE_HOP);
    expect(standingOn(s)).toBe(GROUND);
    const ys = [s.y, ...run(s, 5, TOP)];
    expect(ys.length * DT).toBeCloseTo(P.hopDuration, 1);
    expect(Math.max(...ys)).toBeGreaterThan(TOP);
    expect(s.mode).toBe(LEDGE_STAND);
    expect(s.y).toBe(TOP);
    expect(standingOn(s)).toBe(5);
    expect(s.squash).toBeCloseTo(P.landSquash, 2);
  });

  it('falls from mid-hop when it moves back over the ground', () => {
    const s = createLedge(0, GROUND);
    for (let i = 0; i < 5; i++) stepLedge(s, 5, TOP, DT, P);
    const mid = s.y;
    expect(mid).toBeGreaterThan(0);
    stepLedge(s, GROUND, 0, DT, P);
    expect(s.mode).toBe(LEDGE_FALL);
    run(s, GROUND, 0);
    expect(s.y).toBe(0);
    expect(standingOn(s)).toBe(GROUND);
  });

  it('hops onto a tile it reaches mid-fall', () => {
    const s = createLedge(TOP, 1);
    stepLedge(s, GROUND, 0, DT, P);
    stepLedge(s, 1, TOP, DT, P);
    expect(s.mode).toBe(LEDGE_HOP);
    run(s, 1, TOP);
    expect(standingOn(s)).toBe(1);
  });

  it('stays on the ground while walking on the ground', () => {
    const s = createLedge(0, GROUND);
    for (let i = 0; i < 10; i++) stepLedge(s, GROUND, 0, DT, P);
    expect(s.mode).toBe(LEDGE_STAND);
    expect(s.y).toBe(0);
    expect(s.squash).toBe(0);
  });

  it('lets the landing squash recover', () => {
    const s = createLedge(0, GROUND);
    s.squash = P.landSquash;
    for (let i = 0; i < 60; i++) stepLedge(s, GROUND, 0, DT, P);
    expect(s.squash).toBeLessThan(0.01);
  });
});

describe('stepLedge over a landscape', () => {
  it('hops up onto a tile more than stepGlide higher, with a bigger, longer hop', () => {
    const base = createLedge(0, GROUND);
    const baseYs = [base.y, ...run(base, 5, TOP)];
    const s = createLedge(TOP, 1);
    const top = TOP + 0.4;
    stepLedge(s, 2, top, DT, P);
    expect(s.mode).toBe(LEDGE_HOP);
    const ys = [s.y, ...run(s, 2, top)];
    expect(s.y).toBe(top);
    expect(standingOn(s)).toBe(2);
    expect(Math.max(...ys) - top).toBeGreaterThan(Math.max(...baseYs) - TOP);
    expect(ys.length).toBeGreaterThan(baseYs.length);
  });

  it('falls onto a tile more than stepGlide lower and lands standing on it', () => {
    const s = createLedge(TOP + 0.6, 1);
    stepLedge(s, 2, TOP, DT, P);
    expect(s.mode).toBe(LEDGE_FALL);
    run(s, 2, TOP);
    expect(s.mode).toBe(LEDGE_STAND);
    expect(s.y).toBe(TOP);
    expect(standingOn(s)).toBe(2);
    expect(s.squash).toBeGreaterThan(0);
  });

  it('glides over a small step up between tiles', () => {
    const s = createLedge(TOP, 1);
    stepLedge(s, 2, TOP + P.stepGlide * 0.8, DT, P);
    expect(s.mode).toBe(LEDGE_STAND);
    expect(standingOn(s)).toBe(2);
  });

  it('keeps falling past a tile edge that is still below the feet', () => {
    const s = createLedge(1, 1);
    stepLedge(s, GROUND, 0, DT, P);
    stepLedge(s, 3, TOP, DT, P);
    expect(s.mode).toBe(LEDGE_FALL);
    run(s, 3, TOP);
    expect(standingOn(s)).toBe(3);
    expect(s.y).toBe(TOP);
  });
});

describe('hopScale', () => {
  it('is 1 up to hopStep and grows in proportion past it', () => {
    expect(hopScale(0.05, P)).toBe(1);
    expect(hopScale(P.hopStep, P)).toBe(1);
    expect(hopScale(P.hopStep * 2.5, P)).toBeCloseTo(2.5);
  });
});

describe('hopHeightAt', () => {
  it('starts and ends on the given heights with the apex in the middle', () => {
    expect(hopHeightAt(0, 0.2, 0, 0.1)).toBe(0);
    expect(hopHeightAt(0, 0.2, 1, 0.1)).toBeCloseTo(0.2);
    expect(hopHeightAt(0, 0.2, 0.5, 0.1)).toBeCloseTo(0.2);
  });
});
