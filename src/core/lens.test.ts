import { describe, expect, it } from 'vitest';
import { ELEMENTS } from './elements/index.ts';
import { NO_FILTERS } from './explorer.ts';
import {
  filterDim,
  hasFilters,
  LENS_KEYS,
  LENS_SCALES,
  lensDomain,
  lensLevel,
  lensLevels,
  lensValue,
  NO_DATA,
  shownDim,
  stepDim,
} from './lens.ts';

const byNumber = (n: number) => ELEMENTS[n - 1]!;
const H = 1;
const C = 6;
const FE = 26;
const OS = 76;
const OG = 118;

describe('lensLevels', () => {
  it('keeps every level in [0, 1] or NO_DATA, for every key', () => {
    for (const key of LENS_KEYS) {
      const levels = lensLevels(ELEMENTS, key);
      expect(levels).toHaveLength(ELEMENTS.length);
      for (const v of levels) expect(v === NO_DATA || (v >= 0 && v <= 1)).toBe(true);
      expect(Math.min(...levels.filter((v) => v !== NO_DATA))).toBe(0);
      expect(Math.max(...levels)).toBe(1);
    }
  });

  it('gives unknown values NO_DATA', () => {
    const levels = lensLevels(ELEMENTS, 'density');
    ELEMENTS.forEach((e, i) => {
      expect(levels[i] === NO_DATA).toBe(e.density === null);
    });
  });

  it('puts the extremes at the ends: hydrogen lightest, oganesson heaviest', () => {
    const levels = lensLevels(ELEMENTS, 'atomicMass');
    expect(levels[H - 1]).toBe(0);
    expect(levels[OG - 1]).toBe(1);
    expect(levels[FE - 1]).toBeGreaterThan(levels[C - 1]!);
  });

  it('reads density on a log scale, so gases and metals both spread out', () => {
    expect(LENS_SCALES.density).toBe('log');
    const log = lensLevels(ELEMENTS, 'density');
    const linear = lensLevels(ELEMENTS, 'density', 'linear');
    // On a linear scale carbon (2.27) sits near the floor; on a log one it is well up.
    expect(linear[C - 1]).toBeLessThan(0.15);
    expect(log[C - 1]).toBeGreaterThan(0.5);
    expect(log[OS - 1]).toBeGreaterThan(0.95);
  });

  it('puts antiquity first on the discovery lens', () => {
    const levels = lensLevels(ELEMENTS, 'yearDiscovered');
    expect(byNumber(FE).discoveredInAntiquity).toBe(true);
    expect(lensValue(byNumber(FE), 'yearDiscovered')).toBe(-Infinity);
    expect(levels[FE - 1]).toBe(0);
    expect(levels[H - 1]).toBeGreaterThan(0);
  });

  it('writes into a given buffer without allocating', () => {
    const out = new Float32Array(ELEMENTS.length);
    expect(lensLevels(ELEMENTS, 'electronegativity', undefined, out)).toBe(out);
  });

  it('is NO_DATA everywhere when no element has a value', () => {
    const blank = ELEMENTS.slice(0, 3).map((e) => ({ ...e, density: null }));
    expect(lensDomain(blank, 'density')).toBeNull();
    expect([...lensLevels(blank, 'density')]).toEqual([NO_DATA, NO_DATA, NO_DATA]);
  });
});

describe('lensLevel', () => {
  const domain = { min: 0, max: 10 };
  it('normalises linearly and clamps', () => {
    expect(lensLevel(5, domain, 'linear')).toBe(0.5);
    expect(lensLevel(-3, domain, 'linear')).toBe(0);
    expect(lensLevel(20, domain, 'linear')).toBe(1);
  });
  it('normalises on log10 and floors non-positive values', () => {
    expect(lensLevel(10, { min: 0, max: 2 }, 'log')).toBe(0.5);
    expect(lensLevel(0, { min: 0, max: 2 }, 'log')).toBe(0);
  });
  it('maps unknowns to NO_DATA and a one-value domain to 1', () => {
    expect(lensLevel(null, domain, 'linear')).toBe(NO_DATA);
    expect(lensLevel(4, { min: 4, max: 4 }, 'linear')).toBe(1);
  });
});

describe('filterDim', () => {
  it('dims nothing without filters', () => {
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(filterDim(ELEMENTS, NO_FILTERS).every((v) => v === 0)).toBe(true);
  });

  it('dims every tile the filters exclude', () => {
    const filters = { ...NO_FILTERS, category: 'noble-gas' as const };
    expect(hasFilters(filters)).toBe(true);
    const dim = filterDim(ELEMENTS, filters);
    ELEMENTS.forEach((e, i) => {
      expect(dim[i]).toBe(e.category === 'noble-gas' ? 0 : 1);
    });
  });
});

describe('stepDim', () => {
  it('fades toward the targets over the duration, then goes quiet', () => {
    const levels = new Float32Array([0, 1]);
    const targets = new Float32Array([1, 0]);
    expect(stepDim(levels, targets, 0.1, 0.2)).toBe(true);
    expect(levels[0]).toBeCloseTo(0.5);
    expect(levels[1]).toBeCloseTo(0.5);
    expect(stepDim(levels, targets, 0.1, 0.2)).toBe(false);
    expect([...levels]).toEqual([1, 0]);
    expect(stepDim(levels, targets, 0.1, 0.2)).toBe(false);
  });

  it('snaps with a zero duration (reduced motion)', () => {
    const levels = new Float32Array([0]);
    expect(stepDim(levels, new Float32Array([1]), 0.016, 0)).toBe(false);
    expect(levels[0]).toBe(1);
  });
});

describe('shownDim', () => {
  it('lifts the dim as the tile wakes', () => {
    expect(shownDim(1, 0)).toBe(1);
    expect(shownDim(1, 1)).toBe(0);
    expect(shownDim(0, 0.5)).toBe(0);
  });
});
