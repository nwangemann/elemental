import { describe, expect, it } from 'vitest';
import { positionOf } from './position.ts';

describe('positionOf', () => {
  it.each([
    [1, 1, 1, 's'],
    [2, 1, 18, 's'],
    [5, 2, 13, 'p'],
    [10, 2, 18, 'p'],
    [26, 4, 8, 'd'],
    [56, 6, 2, 's'],
    [57, 6, null, 'f'],
    [70, 6, null, 'f'],
    [71, 6, 3, 'd'],
    [79, 6, 11, 'd'],
    [89, 7, null, 'f'],
    [102, 7, null, 'f'],
    [103, 7, 3, 'd'],
    [118, 7, 18, 'p'],
  ] as const)('element %i is period %i, group %s, %s-block', (z, period, group, block) => {
    expect(positionOf(z)).toEqual({ period, group, block });
  });

  it('puts exactly 14 elements in each f-block row', () => {
    const f = Array.from({ length: 118 }, (_, i) => positionOf(i + 1)).filter(
      (p) => p.block === 'f',
    );
    expect(f.filter((p) => p.period === 6)).toHaveLength(14);
    expect(f.filter((p) => p.period === 7)).toHaveLength(14);
  });

  it('rejects numbers that are not elements', () => {
    expect(() => positionOf(0)).toThrow(RangeError);
    expect(() => positionOf(119)).toThrow(RangeError);
    expect(() => positionOf(1.5)).toThrow(RangeError);
  });
});
