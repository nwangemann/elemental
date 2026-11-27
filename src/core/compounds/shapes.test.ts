import { describe, expect, it } from 'vitest';
import shapesFixture from './__fixtures__/pubchem-shapes.json' with { type: 'json' };
import shapesData from '../../data/compound-shapes.json' with { type: 'json' };
import { ELEMENTS } from '../elements/index.ts';
import { COMPOUNDS } from './index.ts';
import {
  HAND_SHAPES,
  atomDistance,
  bakeConformer,
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
    expect(buildShapes(COMPOUNDS, FIXTURE.conformers, FIXTURE.cpk, symbolOf)).toEqual(SHAPES);
  });

  it('fails when a shape is missing or its atoms disagree with the formula', () => {
    const { water: _, ...noWater } = FIXTURE.conformers;
    expect(() => buildShapes(COMPOUNDS, noWater, FIXTURE.cpk, symbolOf)).toThrow(
      /No shape for water/,
    );
    const water = COMPOUNDS.find((c) => c.id === 'water')!;
    const wrong = {
      ...water,
      elements: [
        { symbol: 'H', count: 1 },
        { symbol: 'O', count: 1 },
      ],
    };
    expect(() => buildShapes([wrong], FIXTURE.conformers, FIXTURE.cpk, symbolOf)).toThrow(
      /do not match/,
    );
    expect(() => buildShapes(COMPOUNDS, FIXTURE.conformers, {}, symbolOf)).toThrow(/CPK/);
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
