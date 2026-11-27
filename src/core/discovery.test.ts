import { describe, expect, it } from 'vitest';
import {
  ANTIQUITY,
  YEAR_DETENTS,
  YEAR_MAX,
  YEAR_MIN,
  discoveredIn,
  discoveryCounts,
  discoverySummary,
  discoveryTargets,
  knownBy,
  positionOfYear,
  sliderYear,
  yearAt,
  yearFromHash,
  yearLabel,
  yearParam,
} from './discovery.ts';
import { ELEMENTS } from './elements/index.ts';
import { deepLink } from './explorer.ts';
import { lensFromHash } from './lens.ts';
import { temperatureFromHash } from './temperature.ts';

const bySymbol = (s: string) => ELEMENTS.find((e) => e.symbol === s)!;

describe('knownBy', () => {
  it('always knows antiquity elements, dated ones from their year', () => {
    expect(knownBy(bySymbol('Au'), ANTIQUITY)).toBe(true);
    expect(knownBy(bySymbol('Ne'), 1897)).toBe(false);
    expect(knownBy(bySymbol('Ne'), 1898)).toBe(true);
    expect(knownBy({ yearDiscovered: null, discoveredInAntiquity: false }, YEAR_MAX)).toBe(false);
  });

  it('dates aluminium, calcium and fluorine by isolation', () => {
    expect(knownBy(bySymbol('Al'), 1824)).toBe(false);
    expect(knownBy(bySymbol('Ca'), 1808)).toBe(true);
    expect(knownBy(bySymbol('F'), 1885)).toBe(false);
  });
});

describe('discoveryCounts', () => {
  it.each([
    [1700, 12],
    [1800, 32],
    [1869, 63],
    [1900, 83],
    [1945, 96],
    [2000, 114],
    [YEAR_MAX, 118],
  ])('in %i, %i known', (year, known) => {
    expect(discoveryCounts(ELEMENTS, year)).toEqual({ known, toCome: 118 - known });
  });

  it('at the Antiquity stop, knows exactly the antiquity set', () => {
    const antiquity = ELEMENTS.filter((e) => e.discoveredInAntiquity).map((e) => e.symbol);
    expect(antiquity).toEqual(['C', 'S', 'Fe', 'Cu', 'As', 'Ag', 'Sn', 'Sb', 'Au', 'Hg', 'Pb']);
    expect(discoveryCounts(ELEMENTS, ANTIQUITY).known).toBe(antiquity.length);
  });

  it('every element is dated or from antiquity, and none after YEAR_MAX', () => {
    for (const e of ELEMENTS)
      expect(e.discoveredInAntiquity || e.yearDiscovered !== null).toBe(true);
    expect(Math.max(...ELEMENTS.map((e) => e.yearDiscovered ?? 0))).toBe(YEAR_MAX);
    expect(Math.min(...ELEMENTS.map((e) => e.yearDiscovered ?? Infinity))).toBeGreaterThan(
      YEAR_MIN,
    );
  });

  it('reads in words', () => {
    expect(discoverySummary(discoveryCounts(ELEMENTS, 1869))).toBe('63 known, 55 to come');
  });
});

describe('discoveryTargets', () => {
  it('marks undiscovered tiles 1 and the rest 0; off is all 0', () => {
    const out = new Float32Array(ELEMENTS.length);
    discoveryTargets(ELEMENTS, 1869, out);
    expect(out[bySymbol('Ne').number - 1]).toBe(1);
    expect(out[bySymbol('O').number - 1]).toBe(0);
    expect(out.reduce((a, b) => a + b, 0)).toBe(55);
    discoveryTargets(ELEMENTS, null, out);
    expect(out.every((v) => v === 0)).toBe(true);
  });
});

describe('discoveredIn', () => {
  it('lists a busy year in order', () => {
    expect(discoveredIn(ELEMENTS, 1897, 1898).map((e) => e.symbol)).toEqual([
      'Ne',
      'Kr',
      'Xe',
      'Po',
      'Ra',
    ]);
  });

  it('takes the range either way round, exclusive at the smaller end', () => {
    expect(discoveredIn(ELEMENTS, 1898, 1897).map((e) => e.symbol)).toHaveLength(5);
    expect(discoveredIn(ELEMENTS, 1898, 1898)).toEqual([]);
    expect(discoveredIn(ELEMENTS, ANTIQUITY, 1700).map((e) => e.symbol)).toEqual(['P']);
  });
});

describe('slider scale', () => {
  it('puts the Antiquity stop at 0 and today at 1', () => {
    expect(yearAt(0)).toBe(ANTIQUITY);
    expect(positionOfYear(ANTIQUITY)).toBe(0);
    expect(yearAt(1)).toBe(YEAR_MAX);
    expect(positionOfYear(YEAR_MAX)).toBe(1);
    expect(yearAt(-1)).toBe(ANTIQUITY);
    expect(yearAt(2)).toBe(YEAR_MAX);
  });

  it('round-trips every year on the scale', () => {
    for (let y = YEAR_MIN; y <= YEAR_MAX; y++) expect(yearAt(positionOfYear(y))).toBe(y);
  });

  it('is monotonic', () => {
    let last = ANTIQUITY;
    for (let i = 0; i <= 1000; i++) {
      const y = yearAt(i / 1000);
      expect(y).toBeGreaterThanOrEqual(last);
      last = y;
    }
  });

  it('gives 1750 onward most of the track', () => {
    expect(positionOfYear(1750)).toBeLessThan(0.2);
  });

  it('snaps near a detent, not on keyboard steps', () => {
    for (const d of YEAR_DETENTS) expect(sliderYear(positionOfYear(d.year) + 0.005)).toBe(d.year);
    const p = positionOfYear(1870);
    expect(sliderYear(p)).toBe(1869);
    expect(sliderYear(p, false)).toBe(1870);
  });

  it('labels the stop and years', () => {
    expect(yearLabel(ANTIQUITY)).toBe('Antiquity');
    expect(yearLabel(1869)).toBe('1869');
  });
});

describe('year deep link', () => {
  it('reads years and the antiquity stop', () => {
    expect(yearFromHash('#/Ne?year=1869')).toBe(1869);
    expect(yearFromHash('#/Au?year=antiquity')).toBe(ANTIQUITY);
    expect(yearFromHash('#/Au?year=Antiquity')).toBe(ANTIQUITY);
    expect(yearFromHash('#/Au?year=1500')).toBe(YEAR_MIN);
    expect(yearFromHash('#/Au?year=3000')).toBe(YEAR_MAX);
    expect(yearFromHash('#/Au?year=1869.6')).toBe(1870);
    expect(yearFromHash('#/Au?year=soon')).toBeNull();
    expect(yearFromHash('#/Au?year=')).toBeNull();
    expect(yearFromHash('#/Au')).toBeNull();
  });

  it('round-trips through deepLink with the other lenses', () => {
    const ne = bySymbol('Ne');
    for (const year of [ANTIQUITY, 1789, 1869, YEAR_MAX]) {
      const hash = deepLink(ne, 'density', 'meltingPoint', 310.15, year);
      expect(yearFromHash(hash)).toBe(year);
      expect(lensFromHash(hash)).toBe('density');
      expect(lensFromHash(hash, 'colour')).toBe('meltingPoint');
      expect(temperatureFromHash(hash)).toBe(310.15);
    }
    expect(deepLink(ne, null, null, null, 1869)).toBe('#/Ne?year=1869');
    expect(deepLink(ne, null, null, null, ANTIQUITY)).toBe(`#/Ne?year=${yearParam(ANTIQUITY)}`);
  });
});
