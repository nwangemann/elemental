import { describe, expect, it } from 'vitest';
import { encodeField, signedDistance, squaredDistance } from './sdf.ts';

describe('squaredDistance', () => {
  it('matches brute force on a scattered seed set', () => {
    const w = 13;
    const h = 9;
    const seeds = [5, 40, 77, 110];
    const grid = squaredDistance(w, h, (i) => seeds.includes(i));
    for (let i = 0; i < w * h; i++) {
      const x = i % w;
      const y = Math.floor(i / w);
      const best = Math.min(...seeds.map((s) => (x - (s % w)) ** 2 + (y - Math.floor(s / w)) ** 2));
      expect(grid[i]).toBe(best);
    }
  });
});

describe('signedDistance', () => {
  it('is negative inside, positive outside, ±0.5 next to the edge', () => {
    // A 3-pixel-wide vertical bar in a 9 × 3 image.
    const inside = new Uint8Array(27);
    for (let y = 0; y < 3; y++) for (let x = 3; x < 6; x++) inside[y * 9 + x] = 255;
    const d = signedDistance(9, 3, inside);
    expect(d[4]).toBe(-1.5);
    expect(d[3]).toBe(-0.5);
    expect(d[2]).toBe(0.5);
    expect(d[0]).toBe(2.5);
  });
});

describe('encodeField', () => {
  it('averages blocks, scales to output pixels and maps the edge to 128', () => {
    // 4 × 2 field shrunk by 2: left block at the edge, right block 2 supersampled px outside.
    const field = Float64Array.from([0, 0, 2, 2, 0, 0, 2, 2]);
    const { bytes, width, height } = encodeField(field, 4, 2, 2, 2);
    expect([width, height]).toEqual([2, 1]);
    expect(bytes[0]).toBe(128);
    // 1 output px outside with a spread of 2: 0.5 − 1/4.
    expect(bytes[1]).toBe(Math.round(0.25 * 255));
  });
});
