import { describe, expect, it } from 'vitest';
import { ELEMENTS } from '../elements/index.ts';
import { AIR_PPMV, BODY_KG, CRUST_PPM, contextShares, massSharesOfGases } from './contexts.ts';
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
