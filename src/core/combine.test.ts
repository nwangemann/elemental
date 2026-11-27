import { describe, expect, it } from 'vitest';
import {
  atomsIn,
  canAdd,
  exactMatches,
  fitsCarry,
  leftover,
  nearest,
  nothingForms,
  suggestionDim,
  suggestionWeights,
  wrongAmounts,
  type Carried,
} from './combine.ts';
import { COMPOUNDS } from './compounds/index.ts';
import { ELEMENTS } from './elements/index.ts';

const carry = (spec: Record<string, number>): Carried => new Map(Object.entries(spec));
const ids = (list: readonly { id: string }[]) => list.map((c) => c.id);
const SYMBOLS = ELEMENTS.map((e) => e.symbol);
const weightOf = (carried: Carried, symbol: string) =>
  suggestionWeights(carried, COMPOUNDS, SYMBOLS, new Float32Array(SYMBOLS.length))[
    SYMBOLS.indexOf(symbol)
  ]!;

describe('carry limits', () => {
  it('stop at 5 elements and 24 atoms', () => {
    const five = carry({ C: 1, H: 1, O: 1, N: 1, S: 1 });
    expect(canAdd(five, 'C')).toBe('ok');
    expect(canAdd(five, 'P')).toBe('too-many-elements');
    const glucose = carry({ C: 6, H: 12, O: 6 });
    expect(atomsIn(glucose)).toBe(24);
    expect(canAdd(glucose, 'H')).toBe('too-many-atoms');
    expect(fitsCarry(glucose)).toBe(true);
    expect(fitsCarry(carry({ C: 12, H: 22, O: 11 }))).toBe(false);
  });
});

describe('exactMatches', () => {
  it('forms water from H 2, O 1 and nothing from H 1, O 1', () => {
    expect(ids(exactMatches(carry({ H: 2, O: 1 }), COMPOUNDS))).toEqual(['water']);
    expect(exactMatches(carry({ H: 1, O: 1 }), COMPOUNDS)).toEqual([]);
    expect(exactMatches(new Map(), COMPOUNDS)).toEqual([]);
  });

  it('pairs elements with themselves and leaves argon alone', () => {
    expect(ids(exactMatches(carry({ O: 2 }), COMPOUNDS))).toEqual(['oxygen']);
    expect(ids(exactMatches(carry({ O: 3 }), COMPOUNDS))).toEqual(['ozone']);
    expect(ids(exactMatches(carry({ Ar: 1 }), COMPOUNDS))).toEqual(['argon']);
  });

  it('offers both isomers of C₂H₆O, ethanol first', () => {
    expect(ids(exactMatches(carry({ C: 2, H: 6, O: 1 }), COMPOUNDS))).toEqual([
      'ethanol',
      'dimethyl-ether',
    ]);
  });

  it('matches alloys by their set of elements, in any amounts', () => {
    expect(ids(exactMatches(carry({ Fe: 4, C: 1 }), COMPOUNDS))).toEqual(['steel']);
    expect(ids(exactMatches(carry({ Cu: 1, Sn: 1 }), COMPOUNDS))).toEqual(['bronze']);
    expect(exactMatches(carry({ Fe: 4, C: 1, O: 1 }), COMPOUNDS)).toEqual([]);
  });

  it('forms every compound in the set from its own counts', () => {
    for (const c of COMPOUNDS) {
      if (c.kind === 'alloy') continue;
      const counts = carry(Object.fromEntries(c.elements.map((e) => [e.symbol, e.count!])));
      expect(ids(exactMatches(counts, COMPOUNDS)), c.id).toContain(c.id);
    }
  });
});

describe('leftover', () => {
  it('keeps atoms beyond one unit carried', () => {
    const water = COMPOUNDS.find((c) => c.id === 'water')!;
    expect([...leftover(carry({ H: 3, O: 1, N: 1 }), water)]).toEqual([
      ['H', 1],
      ['N', 1],
    ]);
    const steel = COMPOUNDS.find((c) => c.id === 'steel')!;
    expect(leftover(carry({ Fe: 5, C: 1 }), steel).size).toBe(0);
  });
});

describe('nearest', () => {
  it('sorts by atoms missing, then by everyday rank', () => {
    const near = nearest(carry({ H: 1 }), COMPOUNDS);
    // Hydrogen gas needs one atom more; water and hydrogen sulfide need two each, and
    // water is the more everyday.
    expect(ids(near.map((n) => n.compound))).toEqual(['hydrogen', 'water', 'hydrogen-sulfide']);
    expect([...near[1]!.missing]).toEqual([
      ['H', 1],
      ['O', 1],
    ]);
    expect(near[1]!.atomsMissing).toBe(2);
    expect(ids(nearest(carry({ H: 2 }), COMPOUNDS).map((n) => n.compound))[0]).toBe('water');
  });

  it('says how much more of each element: water with one O', () => {
    const [first] = nearest(carry({ H: 2 }), COMPOUNDS);
    expect(first!.compound.id).toBe('water');
    expect([...first!.missing]).toEqual([['O', 1]]);
    expect(first!.atomsExtra).toBe(0);
  });

  it('leaves out exact matches and compounds too big to carry', () => {
    const near = nearest(carry({ C: 12, H: 11 }), COMPOUNDS, 40);
    expect(ids(near.map((n) => n.compound))).not.toContain('sucrose');
    expect(ids(nearest(carry({ O: 2 }), COMPOUNDS, 40).map((n) => n.compound))).not.toContain(
      'oxygen',
    );
  });

  it('counts a missing alloy element once', () => {
    const steel = nearest(carry({ Fe: 3 }), COMPOUNDS, 40).find((n) => n.compound.id === 'steel')!;
    expect([...steel.missing]).toEqual([['C', 1]]);
  });

  it('is empty with nothing carried, so the tray shows starters', () => {
    expect(nearest(new Map(), COMPOUNDS)).toEqual([]);
  });
});

describe('nothingForms', () => {
  it('is true only when no compound holds every carried atom', () => {
    expect(nothingForms(carry({ H: 2 }), COMPOUNDS)).toBe(false);
    expect(nothingForms(carry({ Au: 1 }), COMPOUNDS)).toBe(true);
    expect(nothingForms(carry({ Na: 1, S: 1 }), COMPOUNDS)).toBe(true);
    expect(nothingForms(new Map(), COMPOUNDS)).toBe(false);
  });

  it('still offers the nearest compounds with atoms to drop', () => {
    const near = nearest(carry({ Na: 1, S: 1 }), COMPOUNDS);
    expect(near.length).toBeGreaterThan(0);
    expect(near.every((n) => n.atomsExtra === 1)).toBe(true);
  });
});

describe('wrongAmounts', () => {
  it('teaches glucose as 1 carbon, 2 hydrogen, 1 oxygen, six times over', () => {
    const glucose = wrongAmounts(carry({ C: 1, H: 2, O: 1 }), COMPOUNDS).find(
      (w) => w.compound.id === 'glucose',
    )!;
    expect(glucose.times).toBe(6);
    expect([...glucose.unit]).toEqual([
      ['C', 1],
      ['H', 2],
      ['O', 1],
    ]);
    expect([...glucose.fill]).toEqual([
      ['C', 6],
      ['H', 12],
      ['O', 6],
    ]);
  });

  it('lists closest counts first and skips exact matches and alloys', () => {
    const list = wrongAmounts(carry({ C: 2, H: 6, O: 1 }), COMPOUNDS);
    expect(ids(list.map((w) => w.compound))).not.toContain('ethanol');
    expect(list[0]!.compound.id).toBe('acetic-acid');
    expect(wrongAmounts(carry({ Fe: 1, C: 1 }), COMPOUNDS)).toEqual([]);
  });

  it('offers only fills that fit the carry limit', () => {
    for (const w of wrongAmounts(carry({ C: 1, H: 1, O: 1 }), COMPOUNDS))
      expect(fitsCarry(w.fill), w.compound.id).toBe(true);
  });
});

describe('suggestionWeights', () => {
  it('lights the elements that build the most everyday compounds when nothing is carried', () => {
    const weights = suggestionWeights(
      new Map(),
      COMPOUNDS,
      SYMBOLS,
      new Float32Array(SYMBOLS.length),
    );
    expect(Math.max(...weights)).toBe(1);
    expect(weightOf(new Map(), 'O')).toBe(1);
    expect(weightOf(new Map(), 'Au')).toBe(0);
    expect(weightOf(new Map(), 'H')).toBeGreaterThan(weightOf(new Map(), 'Cu'));
  });

  it('lights only what still completes something, by how everyday it is', () => {
    const h2 = carry({ H: 2 });
    // More compounds still need extra hydrogen than need oxygen; sulfur leads to fewer.
    expect(weightOf(h2, 'H')).toBe(1);
    expect(weightOf(h2, 'O')).toBeGreaterThan(weightOf(h2, 'S'));
    expect(weightOf(h2, 'S')).toBeGreaterThan(0);
    expect(weightOf(h2, 'Na')).toBe(0);
    expect(weightOf(carry({ Au: 1 }), 'O')).toBe(0);
  });

  it('goes dark at the carry limit', () => {
    const full = carry({ C: 6, H: 12, O: 6 });
    for (const symbol of ['C', 'H', 'O', 'N']) expect(weightOf(full, symbol)).toBe(0);
  });
});

describe('suggestionDim', () => {
  it('keeps the strongest suggestion bright, fades weak ones, dims dead ends fully', () => {
    const dim = suggestionDim(new Float32Array([1, 0.5, 0]), 0.6, new Float32Array(3));
    expect([...dim]).toEqual([0, expect.closeTo(0.3), 1]);
  });
});
