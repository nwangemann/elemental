import { describe, expect, it } from 'vitest';
import { createQuality, isSettled, QUALITY, stepQuality, type QualityState } from './quality.ts';

/** Feeds `seconds` of frames at `ms` each; returns how many calls changed the ratio. */
function run(s: QualityState, ms: number, seconds: number): number {
  let changes = 0;
  for (let t = 0; t < seconds * 1000; t += ms) if (stepQuality(s, ms)) changes++;
  return changes;
}

describe('createQuality', () => {
  it('starts at the display ratio, capped', () => {
    expect(createQuality(1).dpr).toBe(1);
    expect(createQuality(3).dpr).toBe(QUALITY.maxDpr);
    expect(createQuality(0.5).dpr).toBe(QUALITY.minDpr);
  });
});

describe('stepQuality', () => {
  it('leaves a fast scene alone', () => {
    const s = createQuality(2);
    expect(run(s, 1000 / 60, 10)).toBe(0);
    expect(s.dpr).toBe(2);
  });

  it('ignores slow frames during the warm-up', () => {
    const s = createQuality(2);
    expect(run(s, 40, QUALITY.warmup - 0.1)).toBe(0);
  });

  it('steps down while slow, one step per window, to the floor', () => {
    const s = createQuality(2);
    run(s, 40, QUALITY.warmup + 2.05);
    expect(s.dpr).toBe(1.5);
    run(s, 40, 20);
    expect(s.dpr).toBe(QUALITY.minDpr);
  });

  it('steps back up when there is room, never past the ceiling', () => {
    const s = createQuality(1.5);
    run(s, 40, QUALITY.warmup + 1.05);
    expect(s.dpr).toBe(1.25);
    run(s, 1000 / 60, 10);
    expect(s.dpr).toBe(1.5);
  });

  it('treats long gaps as pauses, not slow frames', () => {
    const s = createQuality(2);
    run(s, 1000 / 60, QUALITY.warmup + 0.5);
    for (let i = 0; i < 20; i++) expect(stepQuality(s, 1000)).toBe(false);
    expect(s.dpr).toBe(2);
  });

  it('settles on the lower ratio after flip-flopping', () => {
    const s = createQuality(2);
    run(s, 1000 / 60, QUALITY.warmup);
    for (let i = 0; i < 6 && !isSettled(s); i++) {
      run(s, 40, 2); // slow: down
      run(s, 1000 / 60, 2); // fast: up
    }
    expect(isSettled(s)).toBe(true);
    const settled = s.dpr;
    expect(settled).toBeLessThan(2);
    expect(run(s, 40, 5) + run(s, 1000 / 60, 5)).toBe(0);
    expect(s.dpr).toBe(settled);
  });
});
