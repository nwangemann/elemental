import { describe, expect, it } from 'vitest';
import { ELEMENTS } from './elements/index.ts';
import { NO_FILTERS } from './explorer.ts';
import {
  CATEGORY_COLORS,
  COLOUR_RAMP,
  contrastRatio,
  LABEL_COLOR,
  linearRgb,
  luminance,
  NO_DATA_COLOUR,
  rgbLuminance,
  type Rgb,
} from './palette.ts';
import { themeOf } from './themes.ts';
import {
  colourTargets,
  createLiftEase,
  cycleLens,
  filterDim,
  hasFilters,
  LENS_KEYS,
  LENS_SCALES,
  lensDomain,
  lensFromHash,
  lensLegend,
  lensLevel,
  lensLevels,
  lensValue,
  lensValueLabel,
  liftTargets,
  NO_DATA,
  rampColour,
  retargetLift,
  shownDim,
  stepDim,
  stepLift,
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

describe('lensFromHash', () => {
  it('reads a known lens from the deep link query', () => {
    expect(lensFromHash('#/Au?lens=density')).toBe('density');
    expect(lensFromHash('#/au?x=1&lens=meltingPoint')).toBe('meltingPoint');
  });

  it('ignores a missing or unknown lens', () => {
    expect(lensFromHash('#/Au')).toBeNull();
    expect(lensFromHash('#/Au?lens=colour')).toBeNull();
    expect(lensFromHash('')).toBeNull();
  });

  it('reads the colour lens from its own parameter', () => {
    const hash = '#/Fe?lens=density&colour=meltingPoint';
    expect(lensFromHash(hash)).toBe('density');
    expect(lensFromHash(hash, 'height')).toBe('density');
    expect(lensFromHash(hash, 'colour')).toBe('meltingPoint');
    expect(lensFromHash('#/Fe?colour=meltingPoint')).toBeNull();
    expect(lensFromHash('#/Fe?lens=density', 'colour')).toBeNull();
    expect(lensFromHash('#/Fe?colour=nope', 'colour')).toBeNull();
  });
});

/** One linear-light channel as two hex digits of sRGB. */
function encodeChannel(v: number): string {
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, s)) * 255)
    .toString(16)
    .padStart(2, '0');
}

/** Linear-light RGB back to `#rrggbb`, for contrast checks on blended colours. */
function hexOf(c: Rgb): string {
  return `#${encodeChannel(c.r)}${encodeChannel(c.g)}${encodeChannel(c.b)}`;
}

/** Distance between two `#rrggbb` colours in 0–255 sRGB units. */
function distance(a: string, b: string): number {
  let d = 0;
  for (const o of [1, 3, 5])
    d += (parseInt(a.slice(o, o + 2), 16) - parseInt(b.slice(o, o + 2), 16)) ** 2;
  return Math.sqrt(d);
}

const SAMPLES = Array.from({ length: 20 }, (_, i) => i / 19);

describe('colour ramp', () => {
  it('has 5 to 7 stops, ends on the first and last', () => {
    expect(COLOUR_RAMP.length).toBeGreaterThanOrEqual(5);
    expect(COLOUR_RAMP.length).toBeLessThanOrEqual(7);
    expect(hexOf(rampColour(0, { r: 0, g: 0, b: 0 }))).toBe(COLOUR_RAMP[0]);
    expect(hexOf(rampColour(1, { r: 0, g: 0, b: 0 }))).toBe(COLOUR_RAMP.at(-1));
  });

  it('keeps dark labels readable on every level and on no data', () => {
    for (const level of [...SAMPLES, NO_DATA]) {
      const hex = hexOf(rampColour(level, { r: 0, g: 0, b: 0 }));
      expect(contrastRatio(hex, LABEL_COLOR), `${String(level)} ${hex}`).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it('rises in luminance, so it reads in greyscale', () => {
    for (let i = 1; i < COLOUR_RAMP.length; i++)
      expect(luminance(COLOUR_RAMP[i]!)).toBeGreaterThan(luminance(COLOUR_RAMP[i - 1]!));
    const c: Rgb = { r: 0, g: 0, b: 0 };
    let last = -1;
    for (let i = 0; i <= 200; i++) {
      const l = rgbLuminance(rampColour(i / 200, c));
      expect(l).toBeGreaterThan(last);
      last = l;
    }
  });

  it('clamps levels outside 0–1 and writes into the given object', () => {
    const c: Rgb = { r: 0, g: 0, b: 0 };
    expect(rampColour(-0.5, c)).toBe(c);
    expect(hexOf(c)).toBe(COLOUR_RAMP[0]);
    expect(hexOf(rampColour(2, c))).toBe(COLOUR_RAMP.at(-1));
  });

  it('gives no data a look apart from every ramp colour and every family colour', () => {
    expect(hexOf(rampColour(NO_DATA, { r: 0, g: 0, b: 0 }))).toBe(NO_DATA_COLOUR);
    for (const level of SAMPLES)
      expect(
        distance(NO_DATA_COLOUR, hexOf(rampColour(level, { r: 0, g: 0, b: 0 }))),
      ).toBeGreaterThan(60);
    for (const hex of Object.values(CATEGORY_COLORS))
      expect(distance(NO_DATA_COLOUR, hex), hex).toBeGreaterThan(60);
  });
});

describe('colourTargets', () => {
  it('gives every tile its family colour with the lens off', () => {
    const out = colourTargets(ELEMENTS, null);
    expect(out).toHaveLength(ELEMENTS.length * 3);
    const fe = linearRgb(themeOf(byNumber(FE).category).color);
    expect(Array.from(out.slice((FE - 1) * 3, FE * 3))).toEqual(
      [fe.r, fe.g, fe.b].map((v) => Math.fround(v)),
    );
  });

  it('gives ramp colours by level, and the no-data colour where a value is missing', () => {
    const out = colourTargets(ELEMENTS, 'density', new Float32Array(ELEMENTS.length * 3));
    const levels = lensLevels(ELEMENTS, 'density');
    const c: Rgb = { r: 0, g: 0, b: 0 };
    for (let i = 0; i < ELEMENTS.length; i++) {
      rampColour(levels[i]!, c);
      expect(out[i * 3]).toBeCloseTo(c.r, 6);
      expect(out[i * 3 + 1]).toBeCloseTo(c.g, 6);
      expect(out[i * 3 + 2]).toBeCloseTo(c.b, 6);
    }
    const og = linearRgb(NO_DATA_COLOUR);
    expect(levels[OG - 1]).toBe(NO_DATA);
    expect(out[(OG - 1) * 3]).toBeCloseTo(og.r, 6);
  });
});

describe('lensLegend', () => {
  it('reads density on a log scale from hydrogen gas to osmium', () => {
    const legend = lensLegend(ELEMENTS, 'density')!;
    expect(legend.label).toBe('Density');
    expect(legend.log).toBe(true);
    expect(legend.min).toBe(lensValueLabel(byNumber(H), 'density'));
    expect(legend.min).toMatch(/g\/L$/);
    expect(legend.max).toBe(lensValueLabel(byNumber(OS), 'density'));
    expect(legend.mid).toMatch(/g\/cm³$/);
    const mid = Number(legend.mid.replace(/ g\/cm³$/, ''));
    const geometric = Math.sqrt(byNumber(H).density! * byNumber(OS).density!);
    expect(mid).toBeCloseTo(geometric, 3);
    expect(legend.noData).toBe(ELEMENTS.filter((e) => e.density === null).length);
  });

  it('puts the linear middle halfway and counts missing values', () => {
    const legend = lensLegend(ELEMENTS, 'meltingPoint')!;
    expect(legend.log).toBe(false);
    expect(legend.min).toMatch(/ K \(/);
    expect(legend.noData).toBe(ELEMENTS.filter((e) => e.meltingPoint === null).length);
    const known = ELEMENTS.map((e) => e.meltingPoint).filter((v) => v !== null);
    const mid = (Math.min(...known) + Math.max(...known)) / 2;
    expect(legend.mid.startsWith(String(Number(mid.toPrecision(4))))).toBe(true);
  });

  it('starts the discovery lens at antiquity', () => {
    const legend = lensLegend(ELEMENTS, 'yearDiscovered')!;
    expect(legend.min).toBe('Antiquity');
    expect(legend.mid).toMatch(/^\d{4}$/);
  });

  it('has no legend when nothing has a value', () => {
    expect(lensLegend([{ ...byNumber(OG), density: null }], 'density')).toBeNull();
  });
});

describe('lensValueLabel', () => {
  it('formats with units and says when a value is unknown', () => {
    expect(lensValueLabel(byNumber(FE), 'atomicRadius')).toMatch(/pm$/);
    expect(lensValueLabel(byNumber(C), 'yearDiscovered')).toBe('Antiquity');
    expect(lensValueLabel(byNumber(OG), 'meltingPoint')).toBe('Unknown');
  });
});

describe('liftTargets', () => {
  const p = { lensHeight: 1, lensFloor: 0.1 };

  it('is all zero with the lens off', () => {
    expect([...liftTargets(ELEMENTS, null, p)].every((v) => v === 0)).toBe(true);
  });

  it('spreads known values from the floor to the top, unknowns at 0', () => {
    const lift = liftTargets(ELEMENTS, 'density', p);
    const levels = lensLevels(ELEMENTS, 'density');
    ELEMENTS.forEach((_, i) => {
      const level = levels[i]!;
      expect(lift[i]).toBeCloseTo(level === NO_DATA ? 0 : 0.1 + 0.9 * level, 5);
    });
    expect(lift[OS - 1]).toBeGreaterThan(lift[H - 1]!);
  });
});

describe('stepLift', () => {
  it('eases every tile together and marks the ones that move', () => {
    const lift = new Float32Array(3);
    const dirty = new Uint8Array(3);
    const ease = createLiftEase(lift);
    expect(stepLift(ease, lift, dirty, 0.1, 0.6)).toBe(false);
    retargetLift(ease, lift, new Float32Array([1, 0, 2]));
    expect(stepLift(ease, lift, dirty, 0.3, 0.6)).toBe(true);
    expect(lift[0]).toBeCloseTo(0.5, 5);
    expect(lift[2]).toBeCloseTo(1, 5);
    expect([...dirty]).toEqual([1, 0, 1]);
    stepLift(ease, lift, dirty, 1, 0.6);
    expect([...lift]).toEqual([1, 0, 2]);
    expect(stepLift(ease, lift, dirty, 0.1, 0.6)).toBe(false);
  });

  it('snaps with no duration', () => {
    const lift = new Float32Array([0.5]);
    const ease = createLiftEase(lift);
    retargetLift(ease, lift, new Float32Array([0]));
    expect(stepLift(ease, lift, new Uint8Array(1), 0, 0)).toBe(true);
    expect(lift[0]).toBe(0);
  });
});

describe('cycleLens', () => {
  it('runs off, every key, off, and back', () => {
    expect(cycleLens(null, 1)).toBe(LENS_KEYS[0]);
    expect(cycleLens(LENS_KEYS.at(-1)!, 1)).toBeNull();
    expect(cycleLens(null, -1)).toBe(LENS_KEYS.at(-1));
  });
});
