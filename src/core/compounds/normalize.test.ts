import { describe, expect, it } from 'vitest';
import pubchem from './__fixtures__/pubchem-compounds.json' with { type: 'json' };
import { ELEMENTS } from '../elements/index.ts';
import { COMPOUNDS } from './index.ts';
import {
  CARRY_LIMIT,
  buildCompounds,
  parseFormula,
  sameCounts,
  validateCompounds,
  type PubChemCompoundRow,
} from './normalize.ts';
import { COMPOUND_SOURCES, CONTEXTS, type CompoundSource } from './source.ts';

const ROWS = new Map(Object.entries(pubchem as Record<string, PubChemCompoundRow>));
const byId = (id: string) => COMPOUNDS.find((c) => c.id === id)!;

describe('parseFormula', () => {
  it('reads subscripts, ASCII digits and groups', () => {
    expect([...parseFormula('H₂O')]).toEqual([
      ['H', 2],
      ['O', 1],
    ]);
    expect([...parseFormula('C12H22O11')]).toEqual([
      ['C', 12],
      ['H', 22],
      ['O', 11],
    ]);
    expect([...parseFormula('Ca₃(PO₄)₂')]).toEqual([
      ['Ca', 3],
      ['P', 2],
      ['O', 8],
    ]);
    expect([...parseFormula('NaHCO₃')]).toEqual([
      ['Na', 1],
      ['H', 1],
      ['C', 1],
      ['O', 3],
    ]);
  });

  it('rejects what it cannot read', () => {
    expect(() => parseFormula('')).toThrow();
    expect(() => parseFormula('h2o')).toThrow();
    expect(() => parseFormula('Ca3(PO4')).toThrow();
    expect(() => parseFormula('Fe + C')).toThrow();
  });

  it('compares counts in any order', () => {
    expect(sameCounts(parseFormula('NaCl'), parseFormula('ClNa'))).toBe(true);
    expect(sameCounts(parseFormula('H2O'), parseFormula('H2O2'))).toBe(false);
  });
});

describe('buildCompounds', () => {
  const water = COMPOUND_SOURCES.find((s) => s.id === 'water')!;

  it('fails when the display formula disagrees with PubChem', () => {
    const typo: CompoundSource = { ...water, formula: 'H₂O₂' };
    expect(() => buildCompounds([typo], ROWS)).toThrow(/disagrees with PubChem/);
  });

  it('fails without a PubChem row, on a repeated id, or on a misused kind', () => {
    expect(() => buildCompounds([water], new Map())).toThrow(/No PubChem row/);
    expect(() => buildCompounds([water, water], ROWS)).toThrow(/Duplicate/);
    expect(() => buildCompounds([{ ...water, kind: 'atom' }], ROWS)).toThrow(/lone atom/);
  });

  it('rebuilds the committed file from the saved PubChem rows', () => {
    expect(buildCompounds(COMPOUND_SOURCES, ROWS)).toEqual(validateCompounds(COMPOUNDS));
  });
});

describe('the compound set', () => {
  it('has about 40 compounds, ranked in list order', () => {
    expect(COMPOUNDS).toHaveLength(40);
    expect(COMPOUNDS.map((c) => c.rank)).toEqual(COMPOUNDS.map((_, i) => i + 1));
  });

  it('uses only real element symbols', () => {
    const symbols = new Set(ELEMENTS.map((e) => e.symbol));
    for (const c of COMPOUNDS)
      for (const e of c.elements) expect(symbols, c.id).toContain(e.symbol);
  });

  it('marks what is too big to carry', () => {
    expect(byId('sucrose')).toMatchObject({ atoms: 45, carryable: false });
    expect(byId('glucose')).toMatchObject({ atoms: CARRY_LIMIT.atoms, carryable: true });
    expect(byId('caffeine')).toMatchObject({ atoms: 24, carryable: true });
  });

  it('matches alloys by element set and lone atoms by one atom', () => {
    expect(byId('steel')).toMatchObject({ cid: null, atoms: null, kind: 'alloy' });
    expect(byId('steel').elements).toEqual([
      { symbol: 'Fe', count: null },
      { symbol: 'C', count: null },
    ]);
    expect(byId('argon')).toMatchObject({ kind: 'atom', bond: 'none', atoms: 1 });
  });

  it('links isomers both ways', () => {
    expect(byId('ethanol').isomers).toEqual(['dimethyl-ether']);
    expect(byId('dimethyl-ether').isomers).toEqual(['ethanol']);
    expect(COMPOUNDS.filter((c) => c.isomers.length > 0)).toHaveLength(2);
  });

  it('offers water, table salt and carbon dioxide as starters, and fills every context', () => {
    expect(COMPOUNDS.filter((c) => c.starter).map((c) => c.id)).toEqual([
      'water',
      'table-salt',
      'carbon-dioxide',
    ]);
    for (const context of CONTEXTS)
      expect(
        COMPOUNDS.filter((c) => c.contexts.includes(context)).length,
        context,
      ).toBeGreaterThanOrEqual(5);
  });
});
