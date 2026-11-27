import { describe, expect, it } from 'vitest';
import {
  electronAngles,
  atomSummary,
  fillingNote,
  atomOf,
  capacity,
  fillingConfiguration,
  parseConfiguration,
  subshellLabel,
} from './atom.ts';
import { ELEMENTS } from './elements/index.ts';

const bySymbol = (symbol: string) => ELEMENTS.find((e) => e.symbol === symbol)!;
const atom = (symbol: string) => atomOf(bySymbol(symbol).electronConfiguration);
const counts = (symbol: string) => atom(symbol).shells.map((s) => s.electrons);
const labels = (text: string) =>
  parseConfiguration(text).map((s) => `${subshellLabel(s)}${s.electrons}`);

describe('parseConfiguration', () => {
  it('reads plain subshells', () => {
    expect(labels('1s1')).toEqual(['1s1']);
    expect(labels('1s2')).toEqual(['1s2']);
  });

  it('expands cores, with or without a space after them', () => {
    expect(labels('[He]2s1')).toEqual(['1s2', '2s1']);
    expect(labels('[He] 2s2 2p3')).toEqual(['1s2', '2s2', '2p3']);
    expect(labels('[Kr]4d10')).toEqual([
      '1s2',
      '2s2',
      '2p6',
      '3s2',
      '3p6',
      '3d10',
      '4s2',
      '4p6',
      '4d10',
    ]);
  });

  it('accepts subshells in any order and sorts them by n then l', () => {
    expect(labels('[Ar]4s1 3d10').slice(-2)).toEqual(['3d10', '4s1']);
    expect(labels('[Rn]7s2 7p6 5f14 6d10').slice(-6)).toEqual([
      '5f14',
      '6s2',
      '6p6',
      '6d10',
      '7s2',
      '7p6',
    ]);
  });

  it('drops the (calculated) note', () => {
    expect(labels('[Rn]7s2 5f14 6d7 (calculated)').slice(-1)).toEqual(['7s2']);
  });

  it('rejects what it cannot read', () => {
    expect(() => parseConfiguration('[Og]8s1')).toThrow(/unknown core/);
    expect(() => parseConfiguration('1s3')).toThrow(/holds/);
    expect(() => parseConfiguration('2d1')).toThrow(/no 2d/);
    expect(() => parseConfiguration('1s2 1s1')).toThrow(/twice/);
    expect(() => parseConfiguration('1s2 (predicted)')).toThrow(/cannot read/);
  });
});

describe('fillingConfiguration', () => {
  it('fills by n + l, then n', () => {
    const order = fillingConfiguration(118).map(subshellLabel);
    expect(order).toHaveLength(19);
    expect(fillingConfiguration(21).map(subshellLabel)).toEqual([
      '1s',
      '2s',
      '2p',
      '3s',
      '3p',
      '3d',
      '4s',
    ]);
  });

  it('never overfills a subshell', () => {
    for (const s of fillingConfiguration(118))
      expect(s.electrons).toBeLessThanOrEqual(capacity(s.l));
  });
});

describe('atomOf', () => {
  it('hydrogen and helium have one shell', () => {
    expect(counts('H')).toEqual([1]);
    expect(counts('He')).toEqual([2]);
    expect(atom('H').valenceShell).toBe(1);
    expect(atom('He').breaksFillingRule).toBe(false);
  });

  it('chromium moves one 4s electron into 3d', () => {
    const cr = atom('Cr');
    expect(cr.shells.map((s) => s.electrons)).toEqual([2, 8, 13, 1]);
    expect(cr.valenceShell).toBe(4);
    expect(cr.breaksFillingRule).toBe(true);
    expect(cr.differences).toEqual([
      { subshell: '3d', actual: 5, filling: 4 },
      { subshell: '4s', actual: 1, filling: 2 },
    ]);
  });

  it('copper fills 3d', () => {
    expect(counts('Cu')).toEqual([2, 8, 18, 1]);
    expect(atom('Cu').differences.map((d) => d.subshell)).toEqual(['3d', '4s']);
  });

  it('palladium has no fifth shell at all', () => {
    const pd = atom('Pd');
    expect(pd.shells.map((s) => s.electrons)).toEqual([2, 8, 18, 18]);
    expect(pd.valenceShell).toBe(4);
    expect(pd.differences).toEqual([
      { subshell: '4d', actual: 10, filling: 8 },
      { subshell: '5s', actual: 0, filling: 2 },
    ]);
  });

  it('gadolinium keeps 4f half full and puts one in 5d', () => {
    expect(counts('Gd')).toEqual([2, 8, 18, 25, 9, 2]);
    expect(atom('Gd').differences).toEqual([
      { subshell: '4f', actual: 7, filling: 8 },
      { subshell: '5d', actual: 1, filling: 0 },
    ]);
  });

  it('oganesson has seven full-looking shells', () => {
    const og = atom('Og');
    expect(og.shells.map((s) => s.electrons)).toEqual([2, 8, 18, 32, 32, 18, 8]);
    expect(og.valenceShell).toBe(7);
    expect(og.breaksFillingRule).toBe(false);
  });

  it('every element sums to its atomic number', () => {
    for (const e of ELEMENTS)
      expect(atomOf(e.electronConfiguration).electrons, e.symbol).toBe(e.number);
  });

  it('flags the filling-rule exceptions in the data', () => {
    const exceptions = ELEMENTS.filter(
      (e) => atomOf(e.electronConfiguration).breaksFillingRule,
    ).map((e) => e.symbol);
    // The dataset gives Lr as [Rn]7s2 5f14 6d1, which is what the filling rule predicts, so Lr
    // (measured 7p1) is not on this list.
    expect(exceptions).toEqual([
      'Cr',
      'Cu',
      'Nb',
      'Mo',
      'Ru',
      'Rh',
      'Pd',
      'Ag',
      'La',
      'Ce',
      'Gd',
      'Pt',
      'Au',
      'Ac',
      'Th',
      'Pa',
      'U',
      'Np',
      'Cm',
    ]);
  });
});

describe('atomSummary and fillingNote', () => {
  it('summarises shells for a screen reader', () => {
    expect(atomSummary(atomOf('[Ar]3d5 4s1'))).toBe('2, 8, 13, 1 electrons; outer shell 1');
    expect(atomSummary(atomOf('1s1'))).toBe('1 electrons; outer shell 1');
  });

  it('says nothing for an element that follows the rule', () => {
    expect(fillingNote('Iron', atomOf('[Ar]3d6 4s2'))).toBeNull();
  });

  it('names what an exception has and what the rule predicts', () => {
    expect(fillingNote('Chromium', atomOf('[Ar]3d5 4s1'))).toEqual({
      name: 'Chromium',
      actual: '3d5 4s1',
      filling: '3d4 4s2',
    });
    // Palladium has no 5s electrons at all; only the rule's 5s2 shows.
    expect(fillingNote('Palladium', atomOf('[Kr]4d10'))).toEqual({
      name: 'Palladium',
      actual: '4d10',
      filling: '4d8 5s2',
    });
  });
});

describe('electronAngles', () => {
  const top = -Math.PI / 2;

  it('spaces electrons evenly from half a gap past the top when the label already fits', () => {
    const angles = electronAngles(2, 0.1);
    expect(angles[0]).toBeCloseTo(0);
    expect(angles[1]).toBeCloseTo(Math.PI);
    expect(electronAngles(0, 0.1)).toEqual([]);
  });

  it('clears the label on a crowded ring and keeps the rest evenly spaced', () => {
    const h = 0.14;
    const angles = electronAngles(32, h);
    expect(angles).toHaveLength(32);
    expect(angles[0]! - top).toBeCloseTo(h);
    expect(top + 2 * Math.PI - angles[31]!).toBeCloseTo(h);
    const gaps = angles.slice(1).map((a, j) => a - angles[j]!);
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0]!);
    expect(gaps[0]).toBeLessThan((2 * Math.PI) / 32);
  });
});
