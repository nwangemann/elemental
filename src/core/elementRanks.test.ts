import { describe, expect, it } from 'vitest';
import { ELEMENTS } from './elements/index.ts';
import type { Element } from './elements/schema.ts';
import { MAX_RANK_FACTS, MIN_RATIO, comparison, ordinal, rankFacts } from './elementRanks.ts';

const bySymbol = (symbol: string) => ELEMENTS.find((e) => e.symbol === symbol)!;

describe('ordinal', () => {
  it('uses st, nd, rd and th, with the teens all th', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '101st',
      '111th',
    ]);
  });
});

describe('rankFacts', () => {
  it('names whole-table leaders without an ordinal and runners-up with one', () => {
    expect(rankFacts(bySymbol('Os'), ELEMENTS)[0]).toBe('Densest of all elements');
    expect(rankFacts(bySymbol('He'), ELEMENTS)).toContain('Lowest melting point of all elements');
    expect(rankFacts(bySymbol('W'), ELEMENTS)).toContain(
      '2nd highest melting point of all elements',
    );
  });

  it('falls back to leading a period, then a group', () => {
    expect(rankFacts(bySymbol('Au'), ELEMENTS)).toContain('Most electronegative in period 6');
    expect(rankFacts(bySymbol('Cu'), ELEMENTS)[0]).toBe('Densest in period 4');
    expect(rankFacts(bySymbol('Hg'), ELEMENTS)).toContain('Densest in group 12');
  });

  it('puts table ranks before period and group leads, and caps the list', () => {
    const lines = rankFacts(bySymbol('C'), ELEMENTS);
    expect(lines[0]).toBe('Highest melting point of all elements');
    for (const e of ELEMENTS)
      expect(rankFacts(e, ELEMENTS).length).toBeLessThanOrEqual(MAX_RANK_FACTS);
  });

  it('ignores unknown values and scopes too small to mean anything', () => {
    // Period 1 has two elements, so neither "leads" it; oganesson has almost no measured data.
    expect(rankFacts(bySymbol('H'), ELEMENTS).some((l) => l.includes('period 1'))).toBe(false);
    expect(rankFacts(bySymbol('Og'), ELEMENTS)).toEqual([]);
  });

  it('works on any element list, ranking ties together', () => {
    const base = bySymbol('Fe');
    const a: Element = { ...base, number: 1, density: 5 };
    const b: Element = { ...base, number: 2, density: 5 };
    const c: Element = { ...base, number: 3, density: 1 };
    expect(rankFacts(a, [a, b, c])).toContain('Densest of all elements');
    expect(rankFacts(b, [a, b, c])).toContain('Densest of all elements');
  });
});

describe('comparison', () => {
  it('picks the property with the largest ratio and says which way it goes', () => {
    expect(comparison(bySymbol('Au'), bySymbol('Fe'))).toEqual({
      label: 'Compared with Iron',
      value: '3.5× heavier',
    });
    expect(comparison(bySymbol('H'), bySymbol('Os'))?.value).toMatch(/^\d+× less dense$/);
  });

  it('notes kelvin when a temperature wins', () => {
    const base = bySymbol('Fe');
    const hot: Element = { ...base, number: 2, name: 'Hot', meltingPoint: base.meltingPoint! * 3 };
    expect(comparison(base, hot)).toEqual({
      label: 'Compared with Hot',
      value: '3× lower melting point',
      note: 'in kelvin',
    });
  });

  it('says nothing for the same element or when nothing differs enough', () => {
    const fe = bySymbol('Fe');
    expect(comparison(fe, fe)).toBeNull();
    const twin: Element = { ...fe, number: 2, atomicMass: fe.atomicMass * (MIN_RATIO - 0.01) };
    expect(comparison(fe, twin)).toBeNull();
  });
});
