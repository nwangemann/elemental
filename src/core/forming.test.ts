import { describe, expect, it } from 'vitest';
import { COMPOUNDS } from './compounds/index.ts';
import shapes from '../data/compound-shapes.json' with { type: 'json' };
import {
  arcPhase,
  arcPoints,
  assignAtoms,
  createFormClock,
  fitScale,
  formAtoms,
  formDuration,
  formSticks,
  growDelays,
  pickFormed,
  springEase,
  stepFormClock,
  stickCount,
  type FormParams,
  type FormShape,
} from './forming.ts';

const P: FormParams = {
  formLift: 1,
  formRadius: 0.4,
  formMaxScale: 0.15,
  formAtom: 0.4,
  formHydrogen: 0.25,
  formBond: 0.1,
  formTime: 0.8,
  formGrow: 0.6,
  formSpin: 0.5,
};

const byId = (id: string) => COMPOUNDS.find((c) => c.id === id)!;
const WATER: FormShape = shapes.molecules.water;
const SALT: FormShape = shapes.crystals['table-salt'];

describe('pickFormed', () => {
  it('shows the pick when it is one of the matches, else the most everyday', () => {
    const made = [byId('ethanol'), byId('dimethyl-ether')];
    expect(pickFormed(made, null)?.id).toBe('ethanol');
    expect(pickFormed(made, 'dimethyl-ether')?.id).toBe('dimethyl-ether');
    expect(pickFormed(made, 'water')?.id).toBe('ethanol');
  });
  it('forms nothing for a lone atom or no match', () => {
    expect(pickFormed([byId('argon')], null)).toBeUndefined();
    expect(pickFormed([], null)).toBeUndefined();
  });
});

describe('every formable compound has a shape', () => {
  it('molecules in molecules, lattices and alloys in crystals', () => {
    for (const c of COMPOUNDS) {
      if (c.kind === 'atom') continue;
      const table: Record<string, unknown> =
        c.kind === 'molecule' ? shapes.molecules : shapes.crystals;
      expect(table[c.id], c.id).toBeDefined();
    }
  });
});

describe('assignAtoms', () => {
  it('gives each orb an atom of its element', () => {
    const a = assignAtoms(['H', 'H', 'O'], WATER);
    // Water's shape is O, H, H.
    expect([...a]).toEqual([2, 0, 1]);
  });
  it('fills a lattice from the centre and leaves the rest to grow', () => {
    const a = assignAtoms(['Na', 'Cl'], SALT);
    expect(a.filter((o) => o >= 0)).toHaveLength(2);
    const na = SALT.elements.findIndex((_, i) => a[i] === 0);
    expect(SALT.elements[na]).toBe('Na');
    const r = (i: number) => Math.hypot(...SALT.xyz.slice(i * 3, i * 3 + 3));
    const nearestNa = Math.min(...SALT.elements.map((e, i) => (e === 'Na' ? r(i) : Infinity)));
    expect(r(na)).toBe(nearestNa);
  });
  it('leaves spare orbs unused', () => {
    // Orb 2 is the third H, which water has no room for.
    expect([...assignAtoms(['H', 'H', 'H', 'O'], WATER)].toSorted()).toEqual([0, 1, 3]);
  });
});

describe('fitScale', () => {
  it('caps small molecules and fits big ones in the radius', () => {
    expect(fitScale(WATER, P)).toBe(P.formMaxScale);
    const s = fitScale(SALT, P);
    expect(s).toBeLessThan(P.formMaxScale);
    const far = Math.max(
      ...SALT.elements.map((_, i) => Math.hypot(...SALT.xyz.slice(i * 3, i * 3 + 3))),
    );
    expect((far + P.formAtom) * s).toBeCloseTo(P.formRadius);
  });
});

describe('springEase', () => {
  it('starts at 0, overshoots a little, ends at 1', () => {
    expect(springEase(0)).toBe(0);
    expect(springEase(-1)).toBe(0);
    expect(springEase(1)).toBe(1);
    expect(springEase(2)).toBe(1);
    let peak = 0;
    for (let x = 0; x <= 1; x += 0.01) peak = Math.max(peak, springEase(x));
    expect(peak).toBeGreaterThan(1.02);
    expect(peak).toBeLessThan(1.15);
  });
});

/** Water formed from H, H, O orbs at `t` seconds. */
const run = (t: number, reduced = false, spin = 0) => {
  const assign = assignAtoms(['H', 'H', 'O'], WATER);
  const delays = growDelays(WATER, assign, P);
  const slots = new Float32Array([0.1, 0.5, -0.3, 0.2, 0.5, -0.3, -0.1, 0.5, -0.3]);
  const pos = new Float32Array(9);
  const radius = new Float32Array(3);
  const progress = new Float32Array(3);
  formAtoms(WATER, assign, delays, slots, 0.05, 0.1, P, t, spin, reduced, pos, radius, progress);
  return { pos, radius, progress, slots };
};

describe('formAtoms', () => {
  it('starts every carried atom at its orb, with the orb size', () => {
    const { pos, radius } = run(0);
    // Atom 0 is O, carried by orb 2.
    expect(Array.from(pos.slice(0, 3), (v) => +v.toFixed(5))).toEqual([-0.1, 0.5, -0.3]);
    expect(radius[0]).toBeCloseTo(0.05);
  });
  it('ends at the scaled shape over the figure', () => {
    const { pos, radius } = run(5);
    expect(pos[0]).toBeCloseTo(WATER.xyz[0]! * 0.1);
    expect(pos[1]).toBeCloseTo(1 + WATER.xyz[1]! * 0.1);
    expect(pos[2]).toBeCloseTo(WATER.xyz[2]! * 0.1);
    expect(radius[0]).toBeCloseTo(0.4 * 0.1);
    expect(radius[1]).toBeCloseTo(0.25 * 0.1);
  });
  it('is in place at once with reduced motion', () => {
    expect([...run(0, true).pos]).toEqual([...run(5).pos]);
  });
  it('turns about the vertical through the centre', () => {
    const { pos } = run(5, false, Math.PI);
    expect(pos[0]).toBeCloseTo(-WATER.xyz[0]! * 0.1);
    expect(pos[1]).toBeCloseTo(1 + WATER.xyz[1]! * 0.1);
    expect(pos[2]).toBeCloseTo(-WATER.xyz[2]! * 0.1);
  });
  it('grows uncarried lattice atoms from nothing, after the carried ones', () => {
    const assign = assignAtoms(['Na', 'Cl'], SALT);
    const delays = growDelays(SALT, assign, P);
    const n = SALT.elements.length;
    const radius = new Float32Array(n);
    formAtoms(
      SALT,
      assign,
      delays,
      new Float32Array(6),
      0.05,
      0.05,
      P,
      0,
      0,
      false,
      new Float32Array(n * 3),
      radius,
      new Float32Array(n),
    );
    for (let i = 0; i < n; i++) {
      if (assign[i]! >= 0) expect(delays[i]).toBe(0);
      else {
        expect(delays[i]).toBeGreaterThan(0);
        expect(radius[i]).toBe(0);
      }
    }
    expect(formDuration(delays, P)).toBeCloseTo(P.formGrow + P.formTime);
  });
});

describe('formSticks', () => {
  it('draws one stick per bond order, side by side', () => {
    const co2: FormShape = shapes.molecules['carbon-dioxide'];
    expect(stickCount(co2)).toBe(4);
    const pos = new Float32Array(co2.xyz);
    const ends = new Float32Array(4 * 6);
    const thick = new Float32Array(4);
    const n = formSticks(co2, pos, new Float32Array([1, 1, 1]), 0.2, ends, thick);
    expect(n).toBe(4);
    // The first double bond, O(0) to C(2) along x: two sticks 0.2 apart in z.
    expect(ends[2]! - ends[8]!).toBeCloseTo(-0.2);
    expect(ends[0]).toBeCloseTo(-1.2);
    expect(ends[3]).toBeCloseTo(0);
    expect([...thick]).toEqual([1, 1, 1, 1]);
  });
  it('thins sticks whose atoms are still on the way', () => {
    const thick = new Float32Array(2);
    formSticks(
      WATER,
      new Float32Array(WATER.xyz),
      new Float32Array([1, 0.3, 1.1]),
      0.1,
      new Float32Array(12),
      thick,
    );
    expect(thick[0]).toBeCloseTo(0.3);
    expect(thick[1]).toBeCloseTo(1);
  });
});

describe('arcPoints', () => {
  it('links neighbouring tiles with parabolas', () => {
    const out = new Float32Array(2 * 8 * 6);
    const spots = [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 2, z: 2 },
    ];
    const n = arcPoints(spots, 0.2, 0.5, 8, out);
    expect(n).toBe(2 * 8 * 6);
    expect([out[0], out[1], out[2]].map((v) => +v!.toFixed(5))).toEqual([0, 0.2, 0]);
    // The middle of the first arc: 4 · h · ¼ = h above the base.
    expect(out[4 * 6 + 1]).toBeCloseTo(0.2 + 0.5 + 0.15 * 2);
    expect([out[8 * 6 - 3], out[8 * 6 - 2], out[8 * 6 - 1]].map((v) => +v!.toFixed(5))).toEqual([
      2, 0.2, 0,
    ]);
  });
  it('draws nothing for one tile', () => {
    expect(arcPoints([{ x: 0, z: 0 }], 0, 1, 8, new Float32Array(48))).toBe(0);
  });
});

describe('arcPhase', () => {
  it('draws along, holds, then fades', () => {
    expect(arcPhase(0, 0.5, 3, 1)).toEqual([0, 1]);
    expect(arcPhase(0.25, 0.5, 3, 1)).toEqual([0.5, 1]);
    expect(arcPhase(1.5, 0.5, 3, 1)).toEqual([1, 1]);
    expect(arcPhase(2.5, 0.5, 3, 1)[1]).toBeCloseTo(0.5);
    expect(arcPhase(3, 0.5, 3, 1)).toEqual([1, 0]);
  });
});

describe('stepFormClock', () => {
  it('restarts on a new compound, runs while formed, stops on none', () => {
    const c = createFormClock();
    expect(stepFormClock(c, 'water', 0.1, 1)).toBe(0);
    expect(c.moving).toBe(true);
    expect(stepFormClock(c, 'water', 0.5, 1)).toBeCloseTo(0.5);
    stepFormClock(c, 'water', 0.6, 1);
    expect(c.moving).toBe(false);
    expect(stepFormClock(c, 'ozone', 0.1, 1)).toBe(0);
    stepFormClock(c, null, 0.1, 1);
    expect([c.id, c.t, c.moving]).toEqual([null, 0, false]);
  });
});
