import { describe, expect, it } from 'vitest';
import pubchem from './__fixtures__/pubchem.json' with { type: 'json' };
import wikidata from './__fixtures__/wikidata.json' with { type: 'json' };
import {
  buildElements,
  groupWikidata,
  isRealLabel,
  parseConfiguration,
  parseNumber,
  parseOxidationStates,
  parseState,
  validateElements,
  type PubChemTable,
} from './normalize.ts';
import { ELEMENTS } from './index.ts';

describe('field parsers', () => {
  it('treats empty as unknown and rejects junk', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber(' 1.008 ')).toBe(1.008);
    expect(() => parseNumber('n/a')).toThrow();
  });

  it('parses oxidation states', () => {
    expect(parseOxidationStates('+1, -1')).toEqual([1, -1]);
    expect(parseOxidationStates('0')).toEqual([0]);
    expect(parseOxidationStates('')).toEqual([]);
  });

  it('marks predicted states and configurations', () => {
    expect(parseState('Gas')).toEqual({ state: 'gas', predicted: false });
    expect(parseState('Expected to be a Solid')).toEqual({ state: 'solid', predicted: true });
    expect(parseConfiguration('[Rn]7s2 7p6 5f14 6d10 (predicted)')).toEqual({
      configuration: '[Rn]7s2 7p6 5f14 6d10',
      predicted: true,
    });
  });

  it('drops Wikidata placeholders that are not names', () => {
    expect(isRealLabel('Henry Cavendish')).toBe(true);
    expect(isRealLabel('Q12345')).toBe(false);
    expect(isRealLabel('http://www.wikidata.org/.well-known/genid/abc')).toBe(false);
  });
});

describe('groupWikidata', () => {
  const grouped = groupWikidata(wikidata);

  it('ignores hypothetical elements past 118', () => {
    expect(grouped.has(119)).toBe(false);
  });

  it('collects every discoverer once, in order', () => {
    expect(grouped.get(2)?.discoverers).toEqual([
      'Norman Lockyer',
      'Pierre Janssen',
      'William Ramsay',
    ]);
    expect(grouped.get(2)?.namedAfter).toEqual(['Helios']);
  });
});

describe('buildElements', () => {
  const elements = buildElements(pubchem as PubChemTable, groupWikidata(wikidata));
  const byNumber = new Map(elements.map((e) => [e.number, e]));

  it('merges both sources', () => {
    expect(byNumber.get(1)).toMatchObject({
      symbol: 'H',
      name: 'Hydrogen',
      category: 'nonmetal',
      standardState: 'gas',
      discoverers: ['Henry Cavendish'],
    });
  });

  it('keeps unknown values as null, never zero', () => {
    const og = byNumber.get(118);
    expect(og?.meltingPoint).toBeNull();
    expect(og?.standardStateIsPredicted).toBe(true);
  });

  it('records antiquity instead of a year', () => {
    expect(byNumber.get(79)).toMatchObject({ yearDiscovered: null, discoveredInAntiquity: true });
  });
});

describe('committed dataset', () => {
  it('has all 118 elements, valid and in order', () => {
    expect(validateElements(ELEMENTS)).toHaveLength(118);
  });

  it('includes gold where expected', () => {
    expect(ELEMENTS[78]).toMatchObject({ symbol: 'Au', group: 11, period: 6, density: 19.282 });
  });
});
