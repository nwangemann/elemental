import { describe, expect, it } from 'vitest';
import { ELEMENTS } from './elements/index.ts';
import { CATEGORIES } from './elements/categories.ts';
import {
  CATEGORY_LABELS,
  UNKNOWN,
  formatConfiguration,
  formatDensity,
  formatNumber,
  formatOxidationStates,
  formatTemperature,
  overviewFacts,
  placement,
  propertyFacts,
} from './elementFacts.ts';

const byNumber = (n: number) => ELEMENTS[n - 1]!;

describe('formatNumber', () => {
  it('rounds to significant figures and uses a real minus sign', () => {
    expect(formatNumber(1.00794)).toBe('1.008');
    expect(formatNumber(1811)).toBe('1811');
    expect(formatNumber(-259.3)).toBe('−259.3');
    expect(formatNumber(0)).toBe('0');
  });

  it('writes very small and very large numbers in scientific notation', () => {
    expect(formatNumber(0.00008988)).toBe('8.988 × 10⁻⁵');
    expect(formatNumber(6.022e23)).toBe('6.022 × 10²³');
  });
});

describe('unit formatting', () => {
  it('gives temperatures in kelvin with Celsius alongside', () => {
    expect(formatTemperature(54.36)).toBe('54.36 K (−218.8 °C)');
    expect(formatTemperature(1811)).toBe('1811 K (1538 °C)');
    expect(formatTemperature(13.81)).toBe('13.81 K (−259.3 °C)');
    expect(formatTemperature(null)).toBe(UNKNOWN);
  });

  it('gives gas densities in g/L and the rest in g/cm³', () => {
    expect(formatDensity(0.001429, 'gas')).toBe('1.429 g/L');
    expect(formatDensity(7.874, 'solid')).toBe('7.874 g/cm³');
    expect(formatDensity(null, 'solid')).toBe(UNKNOWN);
  });

  it('signs oxidation states, most positive first', () => {
    expect(formatOxidationStates([-1, 1])).toBe('+1, −1');
    expect(formatOxidationStates([0])).toBe('0');
    expect(formatOxidationStates([])).toBe(UNKNOWN);
  });

  it('writes electron counts as superscripts after the noble-gas core', () => {
    expect(formatConfiguration('1s2')).toBe('1s²');
    expect(formatConfiguration('[He]2s2 2p4')).toBe('[He] 2s² 2p⁴');
    expect(formatConfiguration('[Xe]6s2 4f14 5d10')).toBe('[Xe] 6s² 4f¹⁴ 5d¹⁰');
  });
});

describe('panel facts', () => {
  it('labels every family', () => {
    expect(Object.keys(CATEGORY_LABELS).toSorted()).toEqual(CATEGORIES.toSorted());
  });

  it('describes hydrogen', () => {
    const h = byNumber(1);
    expect(placement(h)).toBe('Period 1 · Group 1 · s-block');
    expect(overviewFacts(h)).toContainEqual({ label: 'Family', value: 'Nonmetal' });
    expect(overviewFacts(h)).toContainEqual({ label: 'Discovered', value: '1766' });
    expect(propertyFacts(h)).toContainEqual({ label: 'Density', value: '0.08988 g/L' });
  });

  it('places the f-block in its series and marks predicted values', () => {
    const og = byNumber(118);
    expect(placement(byNumber(57))).toBe('Period 6 · f-block series · f-block');
    expect(propertyFacts(og)).toContainEqual({ label: 'Melting point', value: UNKNOWN });
    const state = overviewFacts(og).find((f) => f.label === 'State at room temperature');
    expect(state?.note).toBe(og.standardStateIsPredicted ? 'predicted' : undefined);
  });

  it('has a value for every fact of every element', () => {
    for (const e of ELEMENTS) {
      for (const fact of [...overviewFacts(e), ...propertyFacts(e)]) {
        expect(fact.value.length).toBeGreaterThan(0);
        expect(fact.value).not.toMatch(/NaN|undefined|null/);
      }
    }
  });
});
