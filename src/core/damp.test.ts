import { describe, expect, it } from 'vitest';
import { damp } from './damp';

describe('damp', () => {
  it('does not move with no time passed', () => {
    expect(damp(0, 10, 5, 0)).toBe(0);
  });

  it('approaches the target and never overshoots', () => {
    const v = damp(0, 10, 5, 0.1);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(10);
  });

  it('gives the same result at any frame rate', () => {
    let at30 = 0;
    for (let i = 0; i < 30; i++) at30 = damp(at30, 10, 4, 1 / 30);
    let at120 = 0;
    for (let i = 0; i < 120; i++) at120 = damp(at120, 10, 4, 1 / 120);
    expect(at30).toBeCloseTo(at120, 10);
  });
});
