// Regenerates src/data/compounds.json from the curated list (src/core/compounds/source.ts)
// and PubChem's CID and molecular formula for each compound (ADR 20). Run with
// `npm run data:compounds`, or `node scripts/build-compounds.ts --offline` to rebuild from the
// saved PubChem rows.
// The PubChem rows are saved as the test fixture, so tests check the committed file offline.
import { readFile, writeFile } from 'node:fs/promises';
import { buildCompounds, type PubChemCompoundRow } from '../src/core/compounds/normalize.ts';
import { COMPOUND_SOURCES } from '../src/core/compounds/source.ts';

const USER_AGENT = 'elemental-data-script/0.1 (periodic table build script)';
const OUT = new URL('../src/data/compounds.json', import.meta.url);
const FIXTURE = new URL(
  '../src/core/compounds/__fixtures__/pubchem-compounds.json',
  import.meta.url,
);
const PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
/** PubChem asks for no more than 5 requests a second; stay well under. */
const GAP_MS = 300;

async function fetchJson<T>(url: string): Promise<T> {
  await new Promise((r) => setTimeout(r, GAP_MS));
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
  return (await res.json()) as T;
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

const offline = process.argv.includes('--offline');
const rows: Record<string, PubChemCompoundRow> = offline
  ? JSON.parse(await readFile(FIXTURE, 'utf8'))
  : await fetchRows();
if (!offline) await writeFile(FIXTURE, `${JSON.stringify(rows, null, 2)}\n`);

const compounds = buildCompounds(COMPOUND_SOURCES, new Map(Object.entries(rows)));
await writeFile(OUT, `${JSON.stringify(compounds, null, 2)}\n`);
console.log(`Wrote ${compounds.length} compounds to src/data/compounds.json`);
