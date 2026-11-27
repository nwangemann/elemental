import { describe, expect, it } from 'vitest';
import { ELEMENTS } from '../elements/index.ts';
import {
  AIR_PPMV,
  BODY_KG,
  CRUST_PPM,
  contextFromHash,
  contextLevels,
  contextMembers,
  contextShares,
  CONTEXT_ORDER,
  formatShare,
  foundIn,
  foundInLine,
  KITCHEN_ELEMENTS,
  massSharesOfGases,
} from './contexts.ts';
import { COMPOUNDS } from './index.ts';
import { CONTEXTS } from './source.ts';

const SYMBOLS = new Set(ELEMENTS.map((e) => e.symbol));
const sum = (m: ReadonlyMap<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

describe('context compositions', () => {
  it('use real element symbols only', () => {
    for (const table of [BODY_KG, CRUST_PPM])
      for (const symbol of Object.keys(table)) expect(SYMBOLS, symbol).toContain(symbol);
    for (const formula of Object.keys(AIR_PPMV))
      for (const symbol of massSharesOfGases({ [formula]: 1 }).keys())
        expect(SYMBOLS, formula).toContain(symbol);
  });

  it('give no shares for the kitchen, which is a list only', () => {
    expect(contextShares('kitchen')).toBeNull();
  });

  it('list shares largest first', () => {
    for (const context of ['body', 'air', 'earth'] as const) {
      const values = [...contextShares(context)!.values()];
      expect(values).toEqual(values.toSorted((a, b) => b - a));
    }
  });

  it('weigh dry air as the reference mass table does (Allen, 4th ed.)', () => {
    const air = contextShares('air')!;
    expect(sum(air)).toBeCloseTo(1, 10);
    expect(air.get('N')).toBeCloseTo(0.7552, 3);
    expect(air.get('O')).toBeCloseTo(0.2314, 3);
    expect(air.get('Ar')).toBeCloseTo(0.0129, 3);
    // Carbon is CO₂'s share by mass (0.063 %) times carbon's part of it, plus methane.
    expect(air.get('C')).toBeCloseTo(0.00017, 5);
  });

  it('turns a gas mix into element mass shares', () => {
    const water = massSharesOfGases({ H2O: 1 });
    expect(water.get('O')).toBeCloseTo(15.999 / 18.015, 3);
    expect(sum(water)).toBeCloseTo(1, 10);
  });

  it('account for nearly all of a 70 kg body and of the crust', () => {
    const body = contextShares('body')!;
    expect(sum(body)).toBeGreaterThan(0.98);
    expect(sum(body)).toBeLessThanOrEqual(1);
    expect([...body.keys()].slice(0, 4)).toEqual(['O', 'C', 'H', 'N']);
    const crust = contextShares('earth')!;
    expect(sum(crust)).toBeCloseTo(1, 2);
    expect([...crust.keys()].slice(0, 4)).toEqual(['O', 'Si', 'Al', 'Fe']);
  });

  it('contain every element of the compounds listed under each context', () => {
    for (const context of CONTEXTS) {
      const shares = contextShares(context);
      if (!shares) continue;
      for (const c of COMPOUNDS.filter((k) => k.contexts.includes(context)))
        for (const { symbol } of c.elements) expect([...shares.keys()], c.id).toContain(symbol);
    }
  });
});

describe('context picker', () => {
  const symbols = ELEMENTS.map((e) => e.symbol);

  it('orders the picker as the compound source lists contexts', () => {
    expect(CONTEXT_ORDER).toEqual(CONTEXTS);
  });

  it('lists the kitchen elements its compounds use', () => {
    const used = new Set(
      COMPOUNDS.filter((c) => c.contexts.includes('kitchen')).flatMap((c) =>
        c.elements.map((e) => e.symbol),
      ),
    );
    expect(new Set(KITCHEN_ELEMENTS)).toEqual(used);
  });

  it('lights the elements a context has a share for', () => {
    expect([...contextMembers('air')].toSorted()).toEqual(
      ['Ar', 'C', 'H', 'He', 'Kr', 'N', 'Ne', 'O'].toSorted(),
    );
    expect(contextMembers('kitchen').has('Na')).toBe(true);
  });

  it('spreads heights by log share, largest at 1, missing elements at −1', () => {
    const levels = contextLevels('body', symbols)!;
    expect(levels[symbols.indexOf('O')]).toBe(1);
    expect(levels[symbols.indexOf('Si')]).toBe(0);
    expect(levels[symbols.indexOf('Au')]).toBe(-1);
    const c = levels[symbols.indexOf('C')]!;
    expect(c).toBeGreaterThan(levels[symbols.indexOf('N')]!);
    expect(c).toBeLessThan(1);
  });

  it('floors the crust at one part per billion', () => {
    const levels = contextLevels('earth', symbols)!;
    expect(levels[symbols.indexOf('O')]).toBe(1);
    expect(levels[symbols.indexOf('Fr')]).toBe(0);
    expect(levels[symbols.indexOf('Au')]).toBeGreaterThan(0);
  });

  it('leaves kitchen heights to the height lens', () => {
    expect(contextLevels('kitchen', symbols)).toBeNull();
  });

  it('says where an element is found', () => {
    expect(foundIn('O').map(foundInLine)).toEqual([
      'Your body: 64 % by mass',
      'Air: 23 % by mass',
      'Kitchen: in its compounds',
      "Earth's crust: 46 % by mass",
    ]);
    expect(foundIn('Au').map(foundInLine)).toEqual(["Earth's crust: 4 parts per billion by mass"]);
    expect(foundIn('Fr').map(foundInLine)).toEqual(["Earth's crust: a trace"]);
    expect(foundIn('Og')).toEqual([]);
  });

  it('formats shares', () => {
    expect(formatShare(0.0014)).toBe('0.14 %');
    expect(formatShare(0.012)).toBe('1.2 %');
    expect(formatShare(1.4e-5)).toBe('14 parts per million');
  });

  it('reads a context from a link', () => {
    expect(contextFromHash('#/O?context=body')).toBe('body');
    expect(contextFromHash('#/O?lens=density&context=earth')).toBe('earth');
    expect(contextFromHash('#/O?context=moon')).toBeNull();
    expect(contextFromHash('#/O')).toBeNull();
  });
});
