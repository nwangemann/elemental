// Ball-and-stick shapes for combine mode (ADR 20), baked by `npm run data:compounds`:
// molecules from PubChem's computed 3D conformers, lattices as small chunks cut from
// Crystallography Open Database structures, and a few drawn by hand where neither source
// has one. Free of zod, so the app can import the types and helpers.
import { cellCounts, cutChunk, chunkBonds, fillCell, type Cif } from './cif.ts';
import type { LatticeSpec } from './source.ts';

/** A molecule's atoms and bonds. Coordinates in ångström, centred on the atoms' mean. */
export interface MoleculeShape {
  /** Element symbol per atom. */
  elements: string[];
  /** x, y, z per atom, flattened, rounded to 0.01 Å. */
  xyz: number[];
  /** [atom index, atom index, bond order 1–3]. */
  bonds: [number, number, number][];
}

/** The parts of a PubChem `record_type=3d` compound record the bake reads. */
export interface PubChemConformer {
  /** Atomic number per atom. */
  element: number[];
  x: number[];
  y: number[];
  z: number[];
  /** Bonds by 1-based atom id, as PubChem gives them. */
  aid1: number[];
  aid2: number[];
  order: number[];
}

const round = (v: number) => Math.round(v * 100) / 100 || 0;

/** Centres the atoms on their mean and rounds, so shapes compare and compress well. */
function centre(
  elements: string[],
  points: [number, number, number][],
  bonds: MoleculeShape['bonds'],
) {
  const mean = [0, 1, 2].map((k) => points.reduce((s, p) => s + p[k]!, 0) / points.length);
  return {
    elements,
    xyz: points.flatMap((p) => p.map((v, k) => round(v - mean[k]!))),
    bonds,
  } satisfies MoleculeShape;
}

/** Bakes a PubChem conformer, naming atoms with `symbolOf(atomicNumber)`. */
export function bakeConformer(
  raw: PubChemConformer,
  symbolOf: (n: number) => string,
): MoleculeShape {
  const n = raw.element.length;
  if (raw.x.length !== n || raw.y.length !== n || raw.z.length !== n)
    throw new Error('Ragged conformer');
  const points = raw.element.map(
    (_, i) => [raw.x[i]!, raw.y[i]!, raw.z[i]!] as [number, number, number],
  );
  const bonds = raw.aid1.map((a, i): [number, number, number] => {
    const order = raw.order[i]!;
    if (order < 1 || order > 3) throw new Error(`Bond order ${order} out of range`);
    return [a - 1, raw.aid2[i]! - 1, order];
  });
  return centre(raw.element.map(symbolOf), points, bonds);
}

/** Two atoms `length` Å apart on the x axis. */
function diatomic(a: string, b: string, length: number, order: number): MoleculeShape {
  return centre(
    [a, b],
    [
      [0, 0, 0],
      [length, 0, 0],
    ],
    [[0, 1, order]],
  );
}

/** A bent triatomic: the centre atom bonded to two ends at `length` Å and `angle` degrees. */
function bent(
  mid: string,
  end: string,
  length: number,
  angle: number,
  order: number,
): MoleculeShape {
  const half = ((angle / 2) * Math.PI) / 180;
  const dx = length * Math.sin(half);
  const dy = -length * Math.cos(half);
  return centre(
    [mid, end, end],
    [
      [0, 0, 0],
      [-dx, dy, 0],
      [dx, dy, 0],
    ],
    [
      [0, 1, order],
      [0, 2, order],
    ],
  );
}

/**
 * Shapes PubChem has no 3D conformer for, from experimental geometries (NIST CCCBDB):
 * H–H 0.741 Å; NO₂ N–O 1.193 Å at 134.1°, drawn as two double bonds (it is a resonance
 * hybrid with one unpaired electron, so neither bond is exactly single or double).
 */
export const HAND_SHAPES: Readonly<Record<string, MoleculeShape>> = {
  hydrogen: diatomic('H', 'H', 0.741, 1),
  'nitrogen-dioxide': bent('N', 'O', 1.193, 134.1, 2),
};

/** Element counts of a shape, for checking it against the compound's formula. */
export function shapeCounts(shape: MoleculeShape): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of shape.elements) counts.set(e, (counts.get(e) ?? 0) + 1);
  return counts;
}

/** Distance in Å between two atoms of a shape. */
export function atomDistance(shape: MoleculeShape, i: number, j: number): number {
  const d = [0, 1, 2].map((k) => shape.xyz[i * 3 + k]! - shape.xyz[j * 3 + k]!);
  return Math.hypot(...d);
}

/** A lattice or alloy chunk: a molecule-like shape plus where it came from. */
export interface CrystalShape extends MoleculeShape {
  /** "COD 1000041", or "hand" for a chunk built here. */
  source: string;
}

/** What `compound-shapes.json` holds: atom colours and one shape per molecule, lattice and alloy. */
export interface CompoundShapes {
  /** CPK colour (`#rrggbb`) for every element the compound set uses. */
  cpk: Record<string, string>;
  molecules: Record<string, MoleculeShape>;
  crystals: Record<string, CrystalShape>;
}

/** A chunk of a cubic metal: every lattice point within `radius` Å of one at the origin. */
function cubicMetal(packing: 'bcc' | 'fcc', a: number, radius: number): [number, number, number][] {
  const basis: [number, number, number][] =
    packing === 'bcc'
      ? [
          [0, 0, 0],
          [0.5, 0.5, 0.5],
        ]
      : [
          [0, 0, 0],
          [0.5, 0.5, 0],
          [0.5, 0, 0.5],
          [0, 0.5, 0.5],
        ];
  const out: [number, number, number][] = [];
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++)
      for (let k = -3; k <= 3; k++)
        for (const [u, v, w] of basis) {
          const p: [number, number, number] = [(i + u) * a, (j + v) * a, (k + w) * a];
          if (Math.hypot(...p) <= radius + 1e-6) out.push(p);
        }
  return out.toSorted(
    (p, q) => Math.hypot(...p) - Math.hypot(...q) || p[0] - q[0] || p[1] - q[1] || p[2] - q[2],
  );
}

function handCrystal(
  elements: string[],
  points: [number, number, number][],
  bonds: [number, number, number][],
): CrystalShape {
  return { ...centre(elements, points, bonds), source: 'hand' };
}

/**
 * Chunks with no database structure to cut from:
 * - Bleach: solid sodium hypochlorite is not stable without water, so it is drawn as one
 *   ion pair, a sodium ion beside a hypochlorite ion (Cl–O 1.69 Å, as in its pentahydrate).
 * - Steel: body-centred cubic iron (a = 2.8665 Å), with one carbon in the octahedral gap
 *   between two irons, the site carbon takes in iron.
 * - Bronze: face-centred cubic copper (a = 3.6149 Å) with tin on two of its 19 sites, about
 *   one atom in ten.
 */
export const HAND_CRYSTALS: Readonly<Record<string, CrystalShape>> = (() => {
  const iron = cubicMetal('bcc', 2.8665, 4.1);
  const copper = cubicMetal('fcc', 3.6149, 3.7);
  return {
    bleach: handCrystal(
      ['Na', 'O', 'Cl'],
      [
        [-2.4, 0, 0],
        [0, 0, 0],
        [1.69, 0, 0],
      ],
      [[1, 2, 1]],
    ),
    steel: handCrystal([...iron.map(() => 'Fe'), 'C'], [...iron, [2.8665 / 2, 0, 0]], []),
    bronze: handCrystal(
      copper.map((_, i) => (i === 5 || i === 14 ? 'Sn' : 'Cu')),
      copper,
      [],
    ),
  };
})();

/**
 * Cuts a lattice's chunk from its filled cell. The cell must hold a whole number of formula
 * units (which catches a misread CIF or a wrong entry), and the chunk every element.
 */
export function buildCrystal(
  id: string,
  spec: LatticeSpec,
  cif: Cif,
  formula: readonly { symbol: string; count: number | null }[],
): CrystalShape {
  const atoms = fillCell(cif);
  const counts = cellCounts(atoms);
  const first = formula[0]!;
  const z = (counts.get(first.symbol) ?? 0) / first.count!;
  const whole =
    Number.isInteger(z) &&
    z > 0 &&
    counts.size === formula.length &&
    formula.every((e) => counts.get(e.symbol) === e.count! * z);
  if (!whole)
    throw new Error(
      `${id}: COD ${spec.cod} cell holds ${[...counts].map(([s, n]) => s + n).join(' ')}, not whole formula units`,
    );
  const chunk = cutChunk(cif, atoms, spec.centre, spec.radius);
  const present = new Set(chunk.map((a) => a.symbol));
  if (formula.some((e) => !present.has(e.symbol)))
    throw new Error(`${id}: chunk misses an element; widen its radius`);
  if (chunk.length < 8 || chunk.length > 80)
    throw new Error(`${id}: chunk has ${chunk.length} atoms; aim for 8–80`);
  const bonds = chunkBonds(chunk, spec.bonds).map(([a, b]): [number, number, number] => [a, b, 1]);
  return {
    elements: chunk.map((a) => a.symbol),
    xyz: chunk.flatMap((a) => a.p.map(round)),
    bonds,
    source: `COD ${spec.cod}`,
  };
}

type ShapeCompound = {
  id: string;
  kind: string;
  elements: { symbol: string; count: number | null }[];
};

/**
 * Builds the shapes file. Every molecule gets a PubChem conformer or a hand shape (never
 * both), and its atoms must match the compound's formula. Every lattice gets a chunk from
 * its COD cell or a hand chunk, and every alloy a hand chunk. Every element in the set
 * needs a CPK colour.
 */
export function buildShapes(
  compounds: readonly ShapeCompound[],
  conformers: Readonly<Record<string, PubChemConformer>>,
  cpkHex: Readonly<Record<string, string>>,
  symbolOf: (n: number) => string,
  cells: Readonly<Record<string, Cif>>,
  lattices: Readonly<Record<string, LatticeSpec>>,
): CompoundShapes {
  const molecules: Record<string, MoleculeShape> = {};
  const crystals: Record<string, CrystalShape> = {};
  const used = new Set<string>();
  for (const c of compounds) {
    for (const e of c.elements) used.add(e.symbol);
    if (c.kind === 'lattice' || c.kind === 'alloy') {
      const spec = lattices[c.id];
      const hand = HAND_CRYSTALS[c.id];
      if (spec && hand) throw new Error(`${c.id} has both a COD entry and a hand chunk`);
      if (hand) {
        const symbols = new Set(hand.elements);
        if (symbols.size !== c.elements.length || c.elements.some((e) => !symbols.has(e.symbol)))
          throw new Error(`${c.id}: hand chunk elements do not match its formula`);
        crystals[c.id] = hand;
        continue;
      }
      if (!spec) throw new Error(`No crystal for ${c.id}`);
      const cell = cells[c.id];
      if (!cell) throw new Error(`No COD cell for ${c.id}`);
      crystals[c.id] = buildCrystal(c.id, spec, cell, c.elements);
      continue;
    }
    if (c.kind !== 'molecule') continue;
    const raw = conformers[c.id];
    const hand = HAND_SHAPES[c.id];
    if (raw && hand) throw new Error(`${c.id} has both a conformer and a hand shape`);
    if (!raw && !hand) throw new Error(`No shape for ${c.id}`);
    const shape = hand ?? bakeConformer(raw!, symbolOf);
    const counts = shapeCounts(shape);
    const matches =
      counts.size === c.elements.length &&
      c.elements.every((e) => counts.get(e.symbol) === e.count);
    if (!matches) throw new Error(`${c.id}: shape atoms do not match its formula`);
    molecules[c.id] = shape;
  }
  const cpk: Record<string, string> = {};
  for (const symbol of [...used].toSorted()) {
    const hex = cpkHex[symbol];
    if (!hex || !/^[0-9A-Fa-f]{6}$/.test(hex)) throw new Error(`No CPK colour for ${symbol}`);
    cpk[symbol] = `#${hex.toLowerCase()}`;
  }
  return { cpk, molecules, crystals };
}
