import { describe, expect, it } from 'vitest';
import { damp, stepSpring } from './damp';

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

describe('stepSpring', () => {
  it('does not move with no time passed', () => {
    const s = { value: 0, velocity: 0 };
    stepSpring(s, 10, 5, 0);
    expect(s).toEqual({ value: 0, velocity: 0 });
  });

  it('settles on a still target without overshooting', () => {
    const s = { value: 0, velocity: 0 };
    let max = 0;
    for (let i = 0; i < 240; i++) {
      stepSpring(s, 10, 6, 1 / 60);
      max = Math.max(max, s.value);
    }
    expect(max).toBeLessThanOrEqual(10);
    expect(s.value).toBeCloseTo(10, 4);
    expect(s.velocity).toBeCloseTo(0, 4);
  });

  it('starts slowly (eases in) from rest', () => {
    const s = { value: 0, velocity: 0 };
    stepSpring(s, 10, 6, 1 / 60);
    const first = s.value;
    stepSpring(s, 10, 6, 1 / 60);
    expect(s.value - first).toBeGreaterThan(first);
  });

  it('gives the same result at any frame rate', () => {
    const a = { value: 0, velocity: 3 };
    for (let i = 0; i < 30; i++) stepSpring(a, 10, 4, 1 / 30);
    const b = { value: 0, velocity: 3 };
    for (let i = 0; i < 120; i++) stepSpring(b, 10, 4, 1 / 120);
    expect(a.value).toBeCloseTo(b.value, 10);
    expect(a.velocity).toBeCloseTo(b.velocity, 10);
  });
});
