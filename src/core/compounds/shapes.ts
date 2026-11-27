// Ball-and-stick shapes for combine mode (ADR 20): PubChem's computed 3D conformers, baked to
// compact coordinates by `npm run data:compounds`, plus a few drawn by hand where PubChem has
// no conformer. Free of zod, so the app can import the types and helpers.

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

/** What `compound-shapes.json` holds: atom colours and one shape per molecule. */
export interface CompoundShapes {
  /** CPK colour (`#rrggbb`) for every element the compound set uses. */
  cpk: Record<string, string>;
  molecules: Record<string, MoleculeShape>;
}

/**
 * Builds the shapes file. Every molecule gets a PubChem conformer or a hand shape (never
 * both), and its atoms must match the compound's formula; every element in the set needs
 * a CPK colour.
 */
export function buildShapes(
  compounds: readonly {
    id: string;
    kind: string;
    elements: { symbol: string; count: number | null }[];
  }[],
  conformers: Readonly<Record<string, PubChemConformer>>,
  cpkHex: Readonly<Record<string, string>>,
  symbolOf: (n: number) => string,
): CompoundShapes {
  const molecules: Record<string, MoleculeShape> = {};
  const used = new Set<string>();
  for (const c of compounds) {
    for (const e of c.elements) used.add(e.symbol);
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
  return { cpk, molecules };
}
