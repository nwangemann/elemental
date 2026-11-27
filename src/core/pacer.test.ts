import { describe, expect, it } from 'vitest';
import { createPacer, poseMoved, stepPacer, wakePacer } from './pacer.ts';

const PARAMS = { idleFps: 20, settle: 1 };

describe('stepPacer', () => {
  it('renders every frame while busy', () => {
    const p = createPacer();
    for (let i = 0; i < 200; i++) expect(stepPacer(p, 1 / 60, true, PARAMS)).toBe(0);
    expect(p.paced).toBe(false);
  });

  it('drops to the idle rate after the settle time', () => {
    const p = createPacer();
    let frames = 0;
    while (stepPacer(p, 1 / 60, false, PARAMS) === 0) frames++;
    expect(frames).toBe(59);
    // 50 ms less half a 60 Hz frame, which the display adds on average.
    expect(stepPacer(p, 0.05, false, PARAMS)).toBeCloseTo(50 - 1000 / 120, 1);
    expect(p.paced).toBe(true);
  });

  it('returns to full rate when busy or woken', () => {
    const p = createPacer();
    stepPacer(p, 5, false, PARAMS);
    expect(stepPacer(p, 0.05, true, PARAMS)).toBe(0);
    expect(p.paced).toBe(false);
    stepPacer(p, 5, false, PARAMS);
    wakePacer(p);
    expect(stepPacer(p, 0.05, false, PARAMS)).toBe(0);
  });

  it('stops rendering at idleFps 0', () => {
    const p = createPacer();
    expect(stepPacer(p, 2, false, { idleFps: 0, settle: 1 })).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('displayMs', () => {
  it('learns the display interval from full-rate frames only', () => {
    const p = createPacer();
    for (let i = 0; i < 100; i++) stepPacer(p, 1 / 120, true, PARAMS);
    expect(p.displayMs).toBeCloseTo(1000 / 120, 1);
    stepPacer(p, 5, false, PARAMS);
    stepPacer(p, 0.05, false, PARAMS);
    expect(p.displayMs).toBeCloseTo(1000 / 120, 0);
  });
});

describe('poseMoved', () => {
  it('reports a change beyond eps and remembers the pose', () => {
    const last = new Float64Array(7);
    const q = { x: 0, y: 0, z: 0, w: 1 };
    expect(poseMoved(last, { x: 1, y: 0, z: 0 }, q, 1e-4)).toBe(true);
    expect(poseMoved(last, { x: 1, y: 0, z: 0 }, q, 1e-4)).toBe(false);
    expect(poseMoved(last, { x: 1, y: 0.00005, z: 0 }, q, 1e-4)).toBe(false);
    expect(poseMoved(last, { x: 1, y: 0.00005, z: 0 }, { ...q, y: 0.01 }, 1e-4)).toBe(true);
    expect(Array.from(last)).toEqual([1, 0.00005, 0, 0, 0.01, 0, 1]);
  });
});
