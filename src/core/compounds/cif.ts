// Reads the few parts of a crystallographic information file (CIF) that combine mode needs,
// fills the unit cell from its symmetry operations, and cuts a small chunk for the lattice
// viewer (ADR 20). Pure; used by the data script and tests.

export interface Cell {
  a: number;
  b: number;
  c: number;
  /** Degrees. */
  alpha: number;
  beta: number;
  gamma: number;
}

export interface Site {
  symbol: string;
  /** Fractional coordinates. */
  x: number;
  y: number;
  z: number;
  occupancy: number;
}

export interface Cif {
  cell: Cell;
  /** Symmetry operations such as "-x+1/2, y, z". */
  ops: string[];
  sites: Site[];
  /** The structure's original publication, which COD asks users to credit. */
  citation?: Citation;
}

export interface Citation {
  authors: string[];
  year: number;
  journal: string;
  volume: string;
  page: string;
  doi?: string;
}

/** Splits a CIF line into tokens, keeping quoted strings whole. */
function tokens(line: string): string[] {
  const out: string[] = [];
  const re = /'([^']*)'(?=\s|$)|"([^"]*)"(?=\s|$)|(\S+)/g;
  for (const m of line.matchAll(re)) out.push(m[1] ?? m[2] ?? m[3]!);
  return out;
}

/** A CIF number, dropping the standard uncertainty: "5.6402(3)" → 5.6402. */
export function cifNumber(raw: string): number {
  const n = Number(raw.replace(/\(\d+\)$/, ''));
  if (!Number.isFinite(n)) throw new Error(`Not a CIF number: ${raw}`);
  return n;
}

export function parseCif(text: string): Cif {
  const lines = text.split(/\r?\n/);
  const values = new Map<string, string>();
  const loops: { tags: string[]; rows: string[][] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line.startsWith(';')) {
      // Skip a semicolon text field up to its closing line.
      while (++i < lines.length && !lines[i]!.startsWith(';'));
      continue;
    }
    if (line === 'loop_') {
      const tags: string[] = [];
      while (i + 1 < lines.length && lines[i + 1]!.trim().startsWith('_'))
        tags.push(lines[++i]!.trim().split(/\s/)[0]!);
      const flat: string[] = [];
      while (i + 1 < lines.length) {
        const next = lines[i + 1]!.trim();
        if (
          next === '' ||
          next.startsWith('_') ||
          next === 'loop_' ||
          next.startsWith('data_') ||
          next.startsWith('#')
        )
          break;
        if (next.startsWith(';')) break;
        flat.push(...tokens(next));
        i++;
      }
      const rows: string[][] = [];
      for (let k = 0; k + tags.length <= flat.length; k += tags.length)
        rows.push(flat.slice(k, k + tags.length));
      loops.push({ tags, rows });
    } else if (line.startsWith('_')) {
      const [tag, ...rest] = tokens(line);
      if (rest.length > 0) values.set(tag!, rest.join(' '));
    }
  }

  const num = (tag: string) => {
    const v = values.get(tag);
    if (v === undefined) throw new Error(`CIF has no ${tag}`);
    return cifNumber(v);
  };
  const cell: Cell = {
    a: num('_cell_length_a'),
    b: num('_cell_length_b'),
    c: num('_cell_length_c'),
    alpha: num('_cell_angle_alpha'),
    beta: num('_cell_angle_beta'),
    gamma: num('_cell_angle_gamma'),
  };

  const loopWith = (tag: string) => loops.find((l) => l.tags.includes(tag));
  const opTag = ['_space_group_symop_operation_xyz', '_symmetry_equiv_pos_as_xyz'].find((t) =>
    loopWith(t),
  );
  if (!opTag) throw new Error('CIF has no symmetry operations');
  const opLoop = loopWith(opTag)!;
  const ops = opLoop.rows.map((r) => r[opLoop.tags.indexOf(opTag)]!);

  const siteLoop = loopWith('_atom_site_fract_x');
  if (!siteLoop) throw new Error('CIF has no atom sites');
  const col = (tag: string) => siteLoop.tags.indexOf(tag);
  const symbolCol =
    col('_atom_site_type_symbol') >= 0 ? col('_atom_site_type_symbol') : col('_atom_site_label');
  const sites = siteLoop.rows.map((r): Site => {
    const symbol = /^[A-Z][a-z]?/.exec(r[symbolCol]!)?.[0];
    if (!symbol) throw new Error(`Cannot read an element from ${r[symbolCol]}`);
    const occ = col('_atom_site_occupancy');
    return {
      symbol,
      x: cifNumber(r[col('_atom_site_fract_x')]!),
      y: cifNumber(r[col('_atom_site_fract_y')]!),
      z: cifNumber(r[col('_atom_site_fract_z')]!),
      occupancy: occ >= 0 && r[occ] !== '?' && r[occ] !== '.' ? cifNumber(r[occ]!) : 1,
    };
  });
  const authorLoop = loopWith('_publ_author_name');
  const journal = values.get('_journal_name_full');
  const year = values.get('_journal_year');
  const citation: Citation | undefined =
    authorLoop && journal && year
      ? {
          authors: authorLoop.rows.map((r) => r[0]!),
          year: Number(year),
          journal,
          volume: values.get('_journal_volume') ?? '?',
          page: values.get('_journal_page_first') ?? '?',
          ...(values.has('_journal_paper_doi') ? { doi: values.get('_journal_paper_doi')! } : {}),
        }
      : undefined;
  return { cell, ops, sites, ...(citation ? { citation } : {}) };
}

/** Parses one symmetry operation into a function of fractional coordinates. */
export function parseOp(op: string): (p: [number, number, number]) => [number, number, number] {
  const parts = op.toLowerCase().replace(/\s/g, '').split(',');
  if (parts.length !== 3) throw new Error(`Bad symmetry operation ${op}`);
  const terms = parts.map((part) => {
    const coef = { x: 0, y: 0, z: 0, t: 0 };
    const re = /([+-]?)(\d+(?:\.\d+)?(?:\/\d+)?)?\*?([xyz])?/g;
    let consumed = 0;
    for (const m of part.matchAll(re)) {
      if (m[0] === '') continue;
      consumed += m[0].length;
      const sign = m[1] === '-' ? -1 : 1;
      const [n, d] = (m[2] ?? '1').split('/');
      const value = (sign * Number(n)) / (d ? Number(d) : 1);
      if (m[3]) coef[m[3] as 'x' | 'y' | 'z'] += m[2] ? value : sign;
      else if (m[2]) coef.t += value;
      else throw new Error(`Bad term in ${op}`);
    }
    if (consumed !== part.length) throw new Error(`Bad symmetry operation ${op}`);
    return coef;
  });
  return ([x, y, z]) =>
    terms.map((c) => c.x * x + c.y * y + c.z * z + c.t) as [number, number, number];
}

const wrap = (v: number) => {
  const w = v - Math.floor(v);
  return w > 1 - 1e-4 ? 0 : w;
};

/** True when two fractional coordinates coincide, allowing for wrap-around. */
function near(a: number, b: number): boolean {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d) < 1e-3;
}

function dist(p: readonly number[], q: readonly number[]): number {
  return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
}

/**
 * Every atom in one unit cell (fractional, in [0, 1)). A partly filled site (a disordered
 * hydroxide, say) keeps that share of its copies, the first ones in symmetry-operation
 * order: CIFs list the rotations first, so the kept copies form one ordered arrangement
 * instead of every half-filled position at once.
 */
export function fillCell(cif: Cif): Site[] {
  const ops = cif.ops.map(parseOp);
  const same = (o: Site, x: number, y: number, z: number) =>
    near(o.x, x) && near(o.y, y) && near(o.z, z);
  const out: Site[] = [];
  for (const site of cif.sites) {
    const copies: Site[] = [];
    for (const op of ops) {
      const [x, y, z] = op([site.x, site.y, site.z]).map(wrap) as [number, number, number];
      if (!copies.some((o) => same(o, x, y, z)) && !out.some((o) => same(o, x, y, z)))
        copies.push({ ...site, x, y, z });
    }
    out.push(
      ...copies.slice(
        0,
        site.occupancy >= 1 ? copies.length : Math.round(copies.length * site.occupancy),
      ),
    );
  }
  return out;
}

/** Fractional to Cartesian (Å), with a along x and b in the xy plane. */
export function cartesian(cell: Cell): (f: [number, number, number]) => [number, number, number] {
  const rad = Math.PI / 180;
  const [ca, cb, cg] = [cell.alpha, cell.beta, cell.gamma].map((v) => Math.cos(v * rad)) as [
    number,
    number,
    number,
  ];
  const sg = Math.sin(cell.gamma * rad);
  const cx = cell.c * cb;
  const cy = (cell.c * (ca - cb * cg)) / sg;
  const cz = Math.sqrt(cell.c * cell.c - cx * cx - cy * cy);
  return ([u, v, w]) => [u * cell.a + v * cell.b * cg + w * cx, v * cell.b * sg + w * cy, w * cz];
}

/** Element counts of a filled cell, for checking it against the formula. */
export function cellCounts(atoms: readonly Site[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const a of atoms) counts.set(a.symbol, (counts.get(a.symbol) ?? 0) + 1);
  return counts;
}

export interface ChunkAtom {
  symbol: string;
  /** Å, relative to the chunk's centre atom. */
  p: [number, number, number];
}

/**
 * The atoms within `radius` Å of a centre atom of element `centre`, taken from the 5×5×5
 * block of cells around the middle one. The centre is the middle cell's `centre` atom
 * nearest the cell's middle, so the chunk is the same whatever the cell's origin.
 */
export function cutChunk(
  cif: Cif,
  atoms: readonly Site[],
  centre: string,
  radius: number,
): ChunkAtom[] {
  const toXyz = cartesian(cif.cell);
  const all: ChunkAtom[] = [];
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++)
      for (let k = -2; k <= 2; k++)
        for (const a of atoms)
          all.push({ symbol: a.symbol, p: toXyz([a.x + i, a.y + j, a.z + k]) });
  const mid = toXyz([0.5, 0.5, 0.5]);
  const middle = atoms
    .filter((a) => a.symbol === centre)
    .map((a) => toXyz([a.x, a.y, a.z]))
    .toSorted((p, q) => dist(p, mid) - dist(q, mid))[0];
  if (!middle) throw new Error(`No ${centre} atom in the cell`);
  return all
    .filter((a) => dist(a.p, middle) <= radius + 1e-6)
    .map((a) => ({
      symbol: a.symbol,
      p: a.p.map((v, n) => v - middle[n]!) as [number, number, number],
    }));
}

/** Bonds between chunk atoms whose element pair is listed, when no further apart than its limit. */
export function chunkBonds(
  chunk: readonly ChunkAtom[],
  pairs: readonly (readonly [string, string, number])[],
): [number, number][] {
  const bonds: [number, number][] = [];
  for (let i = 0; i < chunk.length; i++)
    for (let j = i + 1; j < chunk.length; j++) {
      const a = chunk[i]!;
      const b = chunk[j]!;
      const limit = pairs.find(
        ([s, t]) => (s === a.symbol && t === b.symbol) || (s === b.symbol && t === a.symbol),
      )?.[2];
      if (limit !== undefined && Math.hypot(...a.p.map((v, n) => v - b.p[n]!)) <= limit)
        bonds.push([i, j]);
    }
  return bonds;
}
