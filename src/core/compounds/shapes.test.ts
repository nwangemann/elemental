import { describe, expect, it } from 'vitest';
import cellsFixture from './__fixtures__/cod-cells.json' with { type: 'json' };
import shapesFixture from './__fixtures__/pubchem-shapes.json' with { type: 'json' };
import shapesData from '../../data/compound-shapes.json' with { type: 'json' };
import { ELEMENTS } from '../elements/index.ts';
import type { Cif } from './cif.ts';
import { COMPOUNDS } from './index.ts';
import { COMPOUND_SOURCES, type LatticeSpec } from './source.ts';
import {
  HAND_CRYSTALS,
  HAND_SHAPES,
  atomDistance,
  bakeConformer,
  buildCrystal,
  buildShapes,
  type CompoundShapes,
  type MoleculeShape,
  type PubChemConformer,
} from './shapes.ts';

const FIXTURE = shapesFixture as {
  cpk: Record<string, string>;
  conformers: Record<string, PubChemConformer>;
};
const SHAPES = shapesData as unknown as CompoundShapes;
const CELLS = cellsFixture as unknown as Record<string, Cif>;
const LATTICES: Record<string, LatticeSpec> = Object.fromEntries(
  COMPOUND_SOURCES.flatMap((c) => (c.lattice ? [[c.id, c.lattice]] : [])),
);
const build = (conformers = FIXTURE.conformers, cpk = FIXTURE.cpk, compounds = COMPOUNDS) =>
  buildShapes(compounds, conformers, cpk, symbolOf, CELLS, LATTICES);
const symbolOf = (n: number) => ELEMENTS[n - 1]!.symbol;
const shape = (id: string) => SHAPES.molecules[id]!;

/** Angle in degrees at atom `mid` between atoms `a` and `b`. */
function angle(s: MoleculeShape, a: number, mid: number, b: number): number {
  const v = (i: number) => [0, 1, 2].map((k) => s.xyz[i * 3 + k]! - s.xyz[mid * 3 + k]!);
  const [p, q] = [v(a), v(b)];
  const dot = p.reduce((sum, x, k) => sum + x * q[k]!, 0);
  return (Math.acos(dot / (Math.hypot(...p) * Math.hypot(...q))) * 180) / Math.PI;
}

describe('bakeConformer', () => {
  const raw: PubChemConformer = {
    element: [8, 1],
    x: [1, 2],
    y: [0, 0],
    z: [0, 0],
    aid1: [1],
    aid2: [2],
    order: [1],
  };

  it('centres, names atoms and makes bonds 0-based', () => {
    expect(bakeConformer(raw, symbolOf)).toEqual({
      elements: ['O', 'H'],
      xyz: [-0.5, 0, 0, 0.5, 0, 0],
      bonds: [[0, 1, 1]],
    });
  });

  it('rejects ragged coordinates and odd bond orders', () => {
    expect(() => bakeConformer({ ...raw, x: [1] }, symbolOf)).toThrow(/Ragged/);
    expect(() => bakeConformer({ ...raw, order: [4] }, symbolOf)).toThrow(/order/);
  });
});

describe('buildShapes', () => {
  it('rebuilds the committed file from the saved PubChem rows', () => {
    expect(build()).toEqual(SHAPES);
  });

  it('fails when a shape is missing or its atoms disagree with the formula', () => {
    const { water: _, ...noWater } = FIXTURE.conformers;
    expect(() => build(noWater)).toThrow(/No shape for water/);
    const water = COMPOUNDS.find((c) => c.id === 'water')!;
    const wrong = {
      ...water,
      elements: [
        { symbol: 'H', count: 1 },
        { symbol: 'O', count: 1 },
      ],
    };
    expect(() => build(FIXTURE.conformers, FIXTURE.cpk, [wrong])).toThrow(/do not match/);
    expect(() => build(FIXTURE.conformers, {})).toThrow(/CPK/);
  });
});

describe('the shapes', () => {
  it('cover every molecule and nothing else', () => {
    const molecules = COMPOUNDS.filter((c) => c.kind === 'molecule').map((c) => c.id);
    expect(Object.keys(SHAPES.molecules).toSorted()).toEqual(molecules.toSorted());
  });

  it('give every bond a sensible length', () => {
    for (const [id, s] of Object.entries(SHAPES.molecules))
      for (const [a, b] of s.bonds) {
        const d = atomDistance(s, a, b);
        expect(d, `${id} ${a}-${b}`).toBeGreaterThan(0.7);
        expect(d, `${id} ${a}-${b}`).toBeLessThan(2.1);
      }
  });

  it('keep the real shapes: bent water, straight carbon dioxide, bent NO₂', () => {
    const w = shape('water');
    expect(atomDistance(w, 0, 1)).toBeCloseTo(0.96, 1);
    expect(angle(w, 1, 0, 2)).toBeGreaterThan(100);
    expect(angle(w, 1, 0, 2)).toBeLessThan(110);
    const co2 = shape('carbon-dioxide');
    const c = co2.elements.indexOf('C');
    const [o1, o2] = co2.elements.flatMap((e, i) => (e === 'O' ? [i] : []));
    expect(angle(co2, o1!, c, o2!)).toBeCloseTo(180, 0);
    expect(angle(HAND_SHAPES['nitrogen-dioxide']!, 1, 0, 2)).toBeCloseTo(134.1, 0);
    expect(atomDistance(HAND_SHAPES.hydrogen!, 0, 1)).toBeCloseTo(0.74, 2);
  });

  it('bond nitrogen gas triply and oxygen gas doubly', () => {
    expect(shape('nitrogen').bonds).toEqual([[0, 1, 3]]);
    expect(shape('oxygen').bonds).toEqual([[0, 1, 2]]);
  });

  it('colour every element in the set, hydrogen white and oxygen red', () => {
    const used = new Set(COMPOUNDS.flatMap((c) => c.elements.map((e) => e.symbol)));
    expect(Object.keys(SHAPES.cpk).toSorted()).toEqual([...used].toSorted());
    expect(SHAPES.cpk.H).toBe('#ffffff');
    expect(SHAPES.cpk.O).toBe('#ff0d0d');
  });
});

const crystal = (id: string) => SHAPES.crystals[id]!;
const formula = (id: string) => COMPOUNDS.find((c) => c.id === id)!.elements;

describe('the crystals', () => {
  it('cover every lattice and alloy', () => {
    const ids = COMPOUNDS.filter((c) => c.kind === 'lattice' || c.kind === 'alloy').map(
      (c) => c.id,
    );
    expect(Object.keys(SHAPES.crystals).toSorted()).toEqual(ids.toSorted());
  });

  it('come from the database unless there is no structure to cut', () => {
    const hand = Object.entries(SHAPES.crystals).flatMap(([id, c]) =>
      c.source === 'hand' ? [id] : [],
    );
    expect(hand.toSorted()).toEqual(Object.keys(HAND_CRYSTALS).toSorted());
    expect(crystal('table-salt').source).toBe('COD 1000041');
  });

  it('cut table salt as the 3×3×3 cube around a sodium', () => {
    const salt = crystal('table-salt');
    expect(salt.elements).toHaveLength(27);
    expect(salt.elements.filter((e) => e === 'Na')).toHaveLength(13);
    for (const [a, b] of salt.bonds) expect(atomDistance(salt, a, b)).toBeCloseTo(2.81, 1);
  });

  it('keep atoms apart and sticks at bond lengths', () => {
    for (const [id, c] of Object.entries(SHAPES.crystals)) {
      for (let i = 0; i < c.elements.length; i++)
        for (let j = i + 1; j < c.elements.length; j++)
          expect(atomDistance(c, i, j), `${id} ${i}-${j}`).toBeGreaterThan(0.8);
      for (const [a, b] of c.bonds) expect(atomDistance(c, a, b), id).toBeLessThan(3.1);
    }
  });

  it('put one carbon in steel and tin on about one bronze site in ten', () => {
    expect(crystal('steel').elements.filter((e) => e === 'C')).toHaveLength(1);
    const bronze = crystal('bronze').elements;
    expect(bronze.filter((e) => e === 'Sn').length / bronze.length).toBeCloseTo(0.1, 1);
  });

  it('refuse a cell that is not whole formula units', () => {
    const salt = LATTICES['table-salt']!;
    const wrong = [
      { symbol: 'Na', count: 2 },
      { symbol: 'Cl', count: 1 },
    ];
    expect(() => buildCrystal('table-salt', salt, CELLS['table-salt']!, wrong)).toThrow(
      /whole formula units/,
    );
    expect(() =>
      buildCrystal(
        'table-salt',
        { ...salt, radius: 1 },
        CELLS['table-salt']!,
        formula('table-salt'),
      ),
    ).toThrow(/misses an element|atoms/);
  });
});
