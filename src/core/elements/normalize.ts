import { positionOf } from './position.ts';
import { elementsSchema, type Category, type Element } from './schema.ts';

/** PubChem's periodic table response: column names plus rows of strings. */
export interface PubChemTable {
  Table: { Columns: { Column: string[] }; Row: { Cell: string[] }[] };
}

/** One row of a Wikidata SPARQL JSON result (see `scripts/build-elements.ts` for the query). */
export interface WikidataBinding {
  el: { value: string };
  num: { value: string };
  discLabel?: { value: string };
  namedLabel?: { value: string };
}

export interface WikidataFacts {
  wikidataId: string;
  discoverers: string[];
  namedAfter: string[];
}

const PUBCHEM_CATEGORIES: Record<string, Category> = {
  'Alkali metal': 'alkali',
  'Alkaline earth metal': 'alkaline-earth',
  'Transition metal': 'transition',
  'Post-transition metal': 'post-transition',
  Metalloid: 'metalloid',
  Nonmetal: 'nonmetal',
  Halogen: 'halogen',
  'Noble gas': 'noble-gas',
  Lanthanide: 'lanthanide',
  Actinide: 'actinide',
};

/** Empty string means "not known". Anything else must be a number. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim();
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Not a number: "${raw}"`);
  return n;
}

export function parseOxidationStates(raw: string): number[] {
  if (raw.trim() === '') return [];
  return raw.split(',').map((part) => {
    const n = Number(part.trim());
    if (!Number.isInteger(n)) throw new Error(`Bad oxidation state: "${raw}"`);
    return n;
  });
}

export function parseState(raw: string): { state: Element['standardState']; predicted: boolean } {
  const match = /^(Expected to be an? )?(Solid|Liquid|Gas)$/.exec(raw.trim());
  if (!match) throw new Error(`Unknown state: "${raw}"`);
  return {
    state: match[2]!.toLowerCase() as Element['standardState'],
    predicted: match[1] !== undefined,
  };
}

export function parseConfiguration(raw: string): { configuration: string; predicted: boolean } {
  const predicted = /\(predicted\)/i.test(raw);
  return { configuration: raw.replace(/\(predicted\)/i, '').trim(), predicted };
}

export function parseCategory(raw: string): Category {
  const category = PUBCHEM_CATEGORIES[raw.trim()];
  if (!category) throw new Error(`Unknown category: "${raw}"`);
  return category;
}

/**
 * Wikidata returns the bare QID as the label when there is no English label, and a
 * `.well-known/genid` URL for "unknown value". Neither is a name, so drop both.
 */
export function isRealLabel(label: string): boolean {
  return !/^Q\d+$/.test(label) && !label.startsWith('http');
}

/**
 * Groups SPARQL rows (one per discoverer × named-after pair) into one record per element.
 * Hypothetical elements beyond 118 are ignored. Labels keep their first-seen order.
 */
export function groupWikidata(bindings: WikidataBinding[]): Map<number, WikidataFacts> {
  const byNumber = new Map<number, WikidataFacts>();
  for (const b of bindings) {
    const number = Number(b.num.value);
    if (!Number.isInteger(number) || number < 1 || number > 118) continue;
    const wikidataId = b.el.value.slice(b.el.value.lastIndexOf('/') + 1);
    let facts = byNumber.get(number);
    if (!facts) {
      facts = { wikidataId, discoverers: [], namedAfter: [] };
      byNumber.set(number, facts);
    }
    if (facts.wikidataId !== wikidataId)
      throw new Error(`Two Wikidata items for element ${number}`);
    addUnique(facts.discoverers, b.discLabel?.value);
    addUnique(facts.namedAfter, b.namedLabel?.value);
  }
  return byNumber;
}

function addUnique(list: string[], label: string | undefined): void {
  if (label && isRealLabel(label) && !list.includes(label)) list.push(label);
}

/** Merges both sources into validated elements, sorted by atomic number. */
export function buildElements(
  table: PubChemTable,
  wikidata: Map<number, WikidataFacts>,
): Element[] {
  const columns = table.Table.Columns.Column;
  const col = (name: string): number => {
    const i = columns.indexOf(name);
    if (i === -1) throw new Error(`PubChem column missing: ${name}`);
    return i;
  };
  const c = {
    number: col('AtomicNumber'),
    symbol: col('Symbol'),
    name: col('Name'),
    mass: col('AtomicWeight'),
    config: col('ElectronConfiguration'),
    electronegativity: col('Electronegativity'),
    radius: col('AtomicRadius'),
    ionization: col('IonizationEnergy'),
    affinity: col('ElectronAffinity'),
    oxidation: col('OxidationStates'),
    state: col('StandardState'),
    melt: col('MeltingPoint'),
    boil: col('BoilingPoint'),
    density: col('Density'),
    block: col('GroupBlock'),
    year: col('YearDiscovered'),
  };

  const elements = table.Table.Row.map(({ Cell: cell }): Element => {
    const get = (i: number): string => cell[i] ?? '';
    const number = Number(get(c.number));
    const { period, group, block } = positionOf(number);
    const state = parseState(get(c.state));
    const config = parseConfiguration(get(c.config));
    const year = get(c.year).trim();
    const facts = wikidata.get(number);
    if (!facts) throw new Error(`No Wikidata facts for element ${number}`);
    const mass = parseNumber(get(c.mass));
    if (mass === null) throw new Error(`No atomic mass for element ${number}`);

    return {
      number,
      symbol: get(c.symbol).trim(),
      name: get(c.name).trim(),
      atomicMass: mass,
      period,
      group,
      block,
      category: parseCategory(get(c.block)),
      standardState: state.state,
      standardStateIsPredicted: state.predicted,
      electronConfiguration: config.configuration,
      electronConfigurationIsPredicted: config.predicted,
      meltingPoint: parseNumber(get(c.melt)),
      boilingPoint: parseNumber(get(c.boil)),
      density: parseNumber(get(c.density)),
      electronegativity: parseNumber(get(c.electronegativity)),
      atomicRadius: parseNumber(get(c.radius)),
      ionizationEnergy: parseNumber(get(c.ionization)),
      electronAffinity: parseNumber(get(c.affinity)),
      oxidationStates: parseOxidationStates(get(c.oxidation)),
      yearDiscovered: year === 'Ancient' ? null : parseNumber(year),
      discoveredInAntiquity: year === 'Ancient',
      discoverers: facts.discoverers,
      namedAfter: facts.namedAfter,
    };
  });

  return elements.toSorted((a, b) => a.number - b.number);
}

/** Validates the full dataset: 118 elements, schema-valid, numbers 1–118 and unique symbols. */
export function validateElements(data: unknown): Element[] {
  const elements = elementsSchema.parse(data);
  elements.forEach((e, i) => {
    if (e.number !== i + 1) throw new Error(`Expected element ${i + 1}, found ${e.number}`);
  });
  if (new Set(elements.map((e) => e.symbol)).size !== elements.length)
    throw new Error('Duplicate symbols');
  return elements;
}
