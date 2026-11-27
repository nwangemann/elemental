import { describe, expect, it } from 'vitest';
import { ELEMENTS } from './elements/index.ts';
import {
  DEFAULT_OPTIONS,
  NO_FILTERS,
  Tier,
  deepLink,
  explore,
  isSubsequence,
  matchTier,
  normalize,
  parseDeepLink,
  sortValueLabel,
  type ExploreOptions,
} from './explorer.ts';

const byNumber = (n: number) => ELEMENTS[n - 1]!;
const symbols = (opts: Partial<ExploreOptions>) =>
  explore(ELEMENTS, { ...DEFAULT_OPTIONS, ...opts }).map((e) => e.symbol);

describe('normalize and isSubsequence', () => {
  it('folds case, accents and spaces', () => {
    expect(normalize('  Cæsium ')).toBe('cæsium');
    expect(normalize('Éinsteinium')).toBe('einsteinium');
  });

  it('matches letters in order', () => {
    expect(isSubsequence('mgn', 'magnesium')).toBe(true);
    expect(isSubsequence('ngm', 'magnesium')).toBe(false);
    expect(isSubsequence('', 'gold')).toBe(true);
  });
});

describe('matchTier', () => {
  it('ranks exact number, symbol and name above prefixes', () => {
    const fe = byNumber(26);
    expect(matchTier(fe, '26')).toBe(Tier.Exact);
    expect(matchTier(fe, 'fe')).toBe(Tier.Exact);
    expect(matchTier(fe, 'iron')).toBe(Tier.Exact);
    expect(matchTier(fe, 'ir')).toBe(Tier.Prefix);
    expect(matchTier(byNumber(2), 'li')).toBe(Tier.Contains);
    expect(matchTier(byNumber(12), 'mgns')).toBe(Tier.Fuzzy);
  });

  it('does not fuzzy-match digits or very short queries', () => {
    expect(matchTier(byNumber(3), '2')).toBeNull();
    expect(matchTier(byNumber(12), 'mn')).toBeNull();
  });
});

describe('explore', () => {
  it('lists every element in atomic order with no query or filters', () => {
    const all = symbols({});
    expect(all).toHaveLength(118);
    expect(all.slice(0, 3)).toEqual(['H', 'He', 'Li']);
  });

  it('puts the exact symbol first', () => {
    expect(symbols({ query: 'fe' })[0]).toBe('Fe');
    expect(symbols({ query: 'Au' })[0]).toBe('Au');
    expect(symbols({ query: '79' })[0]).toBe('Au');
  });

  it('finds names by prefix and by letters in order', () => {
    expect(symbols({ query: 'gol' })[0]).toBe('Au');
    expect(symbols({ query: 'xnon' })).toEqual(['Xe']);
  });

  it('orders matches of a tier by the chosen sort', () => {
    // Names containing "gen" come before fuzzy matches (germanium), lightest first.
    const gens = symbols({ query: 'gen', sort: 'density' });
    expect(gens.slice(0, 4)).toEqual(['H', 'N', 'O', 'Rg']);
    expect(gens).toContain('Ge');
  });

  it('sorts by a property, unknowns last, either way round', () => {
    const dense = symbols({ sort: 'density', descending: true });
    expect(dense[0]).toBe('Os');
    const light = symbols({ sort: 'density' });
    expect(light[0]).toBe('H');
    const last = explore(ELEMENTS, { ...DEFAULT_OPTIONS, sort: 'density', descending: true }).at(
      -1,
    );
    expect(last?.density).toBeNull();
  });

  it('puts the elements known since antiquity first by discovery year', () => {
    const first = explore(ELEMENTS, { ...DEFAULT_OPTIONS, sort: 'yearDiscovered' })[0]!;
    expect(first.discoveredInAntiquity).toBe(true);
  });

  it('sorts names alphabetically', () => {
    expect(symbols({ sort: 'name' }).slice(0, 2)).toEqual(['Ac', 'Al']);
  });

  it('filters by family, state, block, period and group together', () => {
    expect(symbols({ filters: { ...NO_FILTERS, state: 'liquid' } })).toEqual(['Br', 'Hg']);
    expect(symbols({ filters: { ...NO_FILTERS, category: 'noble-gas', period: 2 } })).toEqual([
      'Ne',
    ]);
    expect(symbols({ filters: { ...NO_FILTERS, group: 11 } })).toEqual(['Cu', 'Ag', 'Au', 'Rg']);
    expect(symbols({ filters: { ...NO_FILTERS, block: 'f' } })).toHaveLength(28);
    expect(symbols({ query: 'gold', filters: { ...NO_FILTERS, state: 'gas' } })).toEqual([]);
  });
});

describe('sortValueLabel', () => {
  it('shows the sorted value with its unit', () => {
    const au = byNumber(79);
    expect(sortValueLabel(au, 'number')).toBe('');
    expect(sortValueLabel(au, 'atomicMass')).toBe('197 u');
    expect(sortValueLabel(au, 'yearDiscovered')).toBe('Antiquity');
    expect(sortValueLabel(au, 'density')).toMatch(/g\/cm³$/);
    expect(sortValueLabel(au, 'meltingPoint')).toMatch(/ K \(/);
  });
});

describe('deep links', () => {
  it('round-trips an element', () => {
    for (const e of ELEMENTS) expect(parseDeepLink(deepLink(e), ELEMENTS)).toBe(e);
  });

  it('carries a lens in the query and still finds the element', () => {
    const au = byNumber(79);
    expect(deepLink(au, 'density')).toBe('#/Au?lens=density');
    expect(parseDeepLink('#/au?lens=density', ELEMENTS)).toBe(au);
  });

  it('accepts lower case, numbers, names and a missing slash', () => {
    const au = byNumber(79);
    expect(parseDeepLink('#/au', ELEMENTS)).toBe(au);
    expect(parseDeepLink('#/79', ELEMENTS)).toBe(au);
    expect(parseDeepLink('#gold', ELEMENTS)).toBe(au);
    expect(parseDeepLink('#/Gold', ELEMENTS)).toBe(au);
  });

  it('ignores empty, unknown and malformed hashes', () => {
    expect(parseDeepLink('', ELEMENTS)).toBeNull();
    expect(parseDeepLink('#/', ELEMENTS)).toBeNull();
    expect(parseDeepLink('#/Xx', ELEMENTS)).toBeNull();
    expect(parseDeepLink('#/%E0%A4%A', ELEMENTS)).toBeNull();
  });
});
