import { describe, expect, it } from 'vitest';
import { createOrbFollow, orbSlots, snapOrbFollow, stepOrbFollow, type OrbParams } from './orbs.ts';

const P: OrbParams = {
  orbDistance: 0.5,
  orbCurve: 0,
  orbLift: 1,
  orbSpacing: 0.1,
  orbGap: 0.05,
  orbRows: 4,
};
const slots = (counts: number[], p = P) => {
  const out = new Float32Array(24 * 3);
  const n = orbSlots(counts, p, out);
  return Array.from({ length: n }, (_, i): [number, number, number] => [
    out[i * 3]!,
    out[i * 3 + 1]!,
    out[i * 3 + 2]!,
  ]);
};

describe('orbSlots', () => {
  it('places one orb behind the figure, centred', () => {
    const [x, y, z] = slots([1])[0]!;
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBeCloseTo(-0.5);
  });

  it('stacks an element upward, then starts a new column', () => {
    const s = slots([5]);
    expect(s.map((p) => p[1])).toEqual([1, 1.1, 1.2, 1.3, 1].map((v) => expect.closeTo(v)));
    expect(s[4]![0]).toBeLessThan(s[0]![0]);
  });

  it('keeps stacks apart and centred, first element on the left (+x)', () => {
    const s = slots([2, 1]);
    expect(s[0]![0]).toBeGreaterThan(s[2]![0]);
    expect(s[0]![0] - s[2]![0]).toBeCloseTo(P.orbSpacing + P.orbGap);
    expect(s[0]![0] + s[2]![0]).toBeCloseTo(0);
  });

  it('keeps 24 atoms of one element within six rows of columns', () => {
    const s = slots([24]);
    expect(s).toHaveLength(24);
    expect(Math.max(...s.map((p) => p[1]))).toBeCloseTo(1.3);
  });

  it('bends the ends of the curve forward', () => {
    const s = slots([1, 1, 1], { ...P, orbCurve: 1 });
    expect(s[0]![2]).toBeGreaterThan(s[1]![2]);
    expect(s[1]![2]).toBeCloseTo(-0.5);
  });
});

describe('stepOrbFollow', () => {
  it('trails the figure, then settles and stops asking for frames', () => {
    const f = createOrbFollow(0, 0, 0, 0);
    stepOrbFollow(f, 1, 0, 0, 0, 6, 1 / 60);
    expect(f.moving).toBe(true);
    expect(f.x).toBeGreaterThan(0);
    expect(f.x).toBeLessThan(0.2);
    for (let i = 0; i < 300; i++) stepOrbFollow(f, 1, 0, 0, 0, 6, 1 / 60);
    expect(f.x).toBeCloseTo(1, 3);
    expect(f.moving).toBe(false);
  });

  it('turns the short way round', () => {
    const f = createOrbFollow(0, 0, 0, 3);
    stepOrbFollow(f, 0, 0, 0, -3, 6, 0.05);
    expect(f.heading).toBeGreaterThan(3);
  });

  it('snaps onto the figure while hidden', () => {
    const f = createOrbFollow(0, 0, 0, 0);
    f.moving = true;
    snapOrbFollow(f, 2, 1, 3, 1);
    expect(f).toEqual({ x: 2, y: 1, z: 3, heading: 1, moving: false });
  });
});
