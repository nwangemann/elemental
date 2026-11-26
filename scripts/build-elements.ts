// Regenerates src/data/elements.json from PubChem and Wikidata. Run with `npm run data`.
import { writeFile } from 'node:fs/promises';
import {
  buildElements,
  groupWikidata,
  validateElements,
  type PubChemTable,
  type WikidataBinding,
} from '../src/core/elements/normalize.ts';

const USER_AGENT = 'elemental-data-script/0.1 (periodic table build script)';
const OUT = new URL('../src/data/elements.json', import.meta.url);

const PUBCHEM_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON';

// P31 instance of, Q11344 chemical element, P1086 atomic number, P246 symbol,
// P61 discoverer or inventor, P138 named after.
const SPARQL = `
SELECT ?el ?num ?discLabel ?namedLabel WHERE {
  ?el wdt:P31 wd:Q11344; wdt:P1086 ?num; wdt:P246 ?sym.
  OPTIONAL { ?el wdt:P61 ?disc. }
  OPTIONAL { ?el wdt:P138 ?named. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?num ?disc ?named`;

async function fetchJson<T>(url: string, accept = 'application/json'): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
  return (await res.json()) as T;
}

const [pubchem, wikidata] = await Promise.all([
  fetchJson<PubChemTable>(PUBCHEM_URL),
  fetchJson<{ results: { bindings: WikidataBinding[] } }>(
    `https://query.wikidata.org/sparql?query=${encodeURIComponent(SPARQL)}`,
    'application/sparql-results+json',
  ),
]);

const elements = validateElements(buildElements(pubchem, groupWikidata(wikidata.results.bindings)));
await writeFile(OUT, `${JSON.stringify(elements, null, 2)}\n`);
console.log(`Wrote ${elements.length} elements to src/data/elements.json`);
