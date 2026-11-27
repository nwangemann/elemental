// Regenerates src/data/compounds.json from the curated list (src/core/compounds/source.ts)
// and PubChem's CID and molecular formula for each compound (ADR 20). Run with
// `npm run data:compounds`, or `node scripts/build-compounds.ts --offline` to rebuild from the
// saved PubChem rows.
// The PubChem rows are saved as the test fixture, so tests check the committed file offline.
import { readFile, writeFile } from 'node:fs/promises';
import { toColumns } from '../src/core/columns.ts';
import { ELEMENTS } from '../src/core/elements/index.ts';
import { buildCompounds, type PubChemCompoundRow } from '../src/core/compounds/normalize.ts';
import { parseCif, type Cif } from '../src/core/compounds/cif.ts';
import { HAND_SHAPES, buildShapes, type PubChemConformer } from '../src/core/compounds/shapes.ts';
import { COMPOUND_SOURCES, type LatticeSpec } from '../src/core/compounds/source.ts';

const USER_AGENT = 'elemental-data-script/0.1 (periodic table build script)';
const OUT = new URL('../src/data/compounds.json', import.meta.url);
const SHAPES_OUT = new URL('../src/data/compound-shapes.json', import.meta.url);
const CELLS_FIXTURE = new URL('../src/core/compounds/__fixtures__/cod-cells.json', import.meta.url);
const COD = 'https://www.crystallography.net/cod';
const SHAPES_FIXTURE = new URL(
  '../src/core/compounds/__fixtures__/pubchem-shapes.json',
  import.meta.url,
);
const FIXTURE = new URL(
  '../src/core/compounds/__fixtures__/pubchem-compounds.json',
  import.meta.url,
);
const PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
/** PubChem asks for no more than 5 requests a second; stay well under. */
const GAP_MS = 300;

async function fetchText(url: string, accept: string): Promise<string> {
  await new Promise((r) => setTimeout(r, GAP_MS));
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
  return res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url, 'application/json')) as T;
}

async function fetchRows(): Promise<Record<string, PubChemCompoundRow>> {
  const cids = new Map<string, number>();
  for (const s of COMPOUND_SOURCES) {
    if (!s.pubchem) continue;
    const list = await fetchJson<{ IdentifierList: { CID: number[] } }>(
      `${PUG}/compound/name/${encodeURIComponent(s.pubchem)}/cids/JSON`,
    );
    const cid = list.IdentifierList.CID[0];
    if (cid === undefined) throw new Error(`PubChem found no CID for ${s.pubchem}`);
    cids.set(s.id, cid);
  }
  const table = await fetchJson<{ PropertyTable: { Properties: PubChemCompoundRow[] } }>(
    `${PUG}/compound/cid/${[...new Set(cids.values())].join(',')}/property/MolecularFormula/JSON`,
  );
  const byCid = new Map(table.PropertyTable.Properties.map((p) => [p.CID, p]));
  const rows: Record<string, PubChemCompoundRow> = {};
  for (const [id, cid] of cids) {
    const row = byCid.get(cid);
    if (!row) throw new Error(`PubChem returned no formula for ${id} (CID ${cid})`);
    rows[id] = { CID: cid, MolecularFormula: row.MolecularFormula };
  }
  return rows;
}

interface ShapeRows {
  cpk: Record<string, string>;
  conformers: Record<string, PubChemConformer>;
}

interface PubChem3dRecord {
  PC_Compounds: {
    atoms: { element: number[] };
    bonds?: { aid1: number[]; aid2: number[]; order: number[] };
    coords: { conformers: { x: number[]; y: number[]; z: number[] }[] }[];
  }[];
}

/** CPK colours from PubChem's periodic table, and a 3D conformer per molecule that has one. */
async function fetchShapeRows(compounds: ReturnType<typeof buildCompounds>): Promise<ShapeRows> {
  const table = await fetchJson<{
    Table: { Columns: { Column: string[] }; Row: { Cell: string[] }[] };
  }>(`${PUG}/periodictable/JSON`);
  const cols = table.Table.Columns.Column;
  const symbolAt = cols.indexOf('Symbol');
  const cpkAt = cols.indexOf('CPKHexColor');
  const cpk: Record<string, string> = {};
  for (const row of table.Table.Row) cpk[row.Cell[symbolAt]!] = row.Cell[cpkAt]!;

  const conformers: Record<string, PubChemConformer> = {};
  for (const c of compounds) {
    if (c.kind !== 'molecule' || c.id in HAND_SHAPES) continue;
    const record = await fetchJson<PubChem3dRecord>(
      `${PUG}/compound/cid/${c.cid}/record/JSON?record_type=3d`,
    );
    const pc = record.PC_Compounds[0]!;
    const xyz = pc.coords[0]!.conformers[0]!;
    const bonds = pc.bonds ?? { aid1: [], aid2: [], order: [] };
    conformers[c.id] = { element: pc.atoms.element, x: xyz.x, y: xyz.y, z: xyz.z, ...bonds };
  }
  return { cpk, conformers };
}

const offline = process.argv.includes('--offline');
const rows: Record<string, PubChemCompoundRow> = offline
  ? JSON.parse(await readFile(FIXTURE, 'utf8'))
  : await fetchRows();
if (!offline) await writeFile(FIXTURE, `${JSON.stringify(rows, null, 2)}\n`);

const compounds = buildCompounds(COMPOUND_SOURCES, new Map(Object.entries(rows)));
// Stored by column, so each field name ships once (ADR 3).
await writeFile(OUT, `${JSON.stringify(toColumns(compounds), null, 2)}\n`);
console.log(`Wrote ${compounds.length} compounds to src/data/compounds.json`);

const shapeRows: ShapeRows = offline
  ? JSON.parse(await readFile(SHAPES_FIXTURE, 'utf8'))
  : await fetchShapeRows(compounds);
if (!offline) {
  // Keep only the colours the set uses, so the fixture stays small.
  const used = new Set(compounds.flatMap((c) => c.elements.map((e) => e.symbol)));
  shapeRows.cpk = Object.fromEntries(Object.entries(shapeRows.cpk).filter(([s]) => used.has(s)));
  await writeFile(SHAPES_FIXTURE, `${JSON.stringify(shapeRows)}\n`);
}
const lattices: Record<string, LatticeSpec> = Object.fromEntries(
  COMPOUND_SOURCES.flatMap((c) => (c.lattice ? [[c.id, c.lattice]] : [])),
);
// Each lattice's CIF from the Crystallography Open Database, kept only as the parsed cell,
// symmetry operations and sites.
const cells: Record<string, Cif> = offline
  ? JSON.parse(await readFile(CELLS_FIXTURE, 'utf8'))
  : Object.fromEntries(
      await Promise.all(
        Object.entries(lattices).map(async ([id, spec], i) => {
          await new Promise((r) => setTimeout(r, i * GAP_MS));
          return [
            id,
            parseCif(await fetchText(`${COD}/${spec.cod}.cif`, 'chemical/x-cif')),
          ] as const;
        }),
      ),
    );
if (!offline) await writeFile(CELLS_FIXTURE, `${JSON.stringify(cells)}\n`);

const symbolOf = (n: number) => {
  const e = ELEMENTS[n - 1];
  if (!e) throw new Error(`No element ${n}`);
  return e.symbol;
};
const shapes = buildShapes(
  compounds,
  shapeRows.conformers,
  shapeRows.cpk,
  symbolOf,
  cells,
  lattices,
);
await writeFile(SHAPES_OUT, `${JSON.stringify(shapes)}\n`);
console.log(
  `Wrote ${Object.keys(shapes.molecules).length} molecules and ${Object.keys(shapes.crystals).length} crystals to src/data/compound-shapes.json`,
);
