import { BLOCKS, CATEGORIES, STATES, type Category } from './elements/categories.ts';
import type { Element } from './elements/schema.ts';
import { formatDensity, formatNumber, formatTemperature, UNKNOWN } from './elementFacts.ts';
import { YEAR_PARAM, yearParam } from './discovery.ts';
import { TEMPERATURE_PARAM, temperatureParam } from './temperature.ts';

/**
 * The explorer's logic, as pure functions: fuzzy search by name, symbol or number, sorting by a
 * property, filtering by family, state, block, period and group, and the `#/Au` deep links.
 * The palette (`ui/Explorer.tsx`) only renders what `explore` returns.
 */

export const SORT_KEYS = [
  'number',
  'name',
  'atomicMass',
  'yearDiscovered',
  'density',
  'electronegativity',
  'meltingPoint',
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  number: 'Atomic number',
  name: 'Name A–Z',
  atomicMass: 'Atomic mass',
  yearDiscovered: 'Discovery year',
  density: 'Density',
  electronegativity: 'Electronegativity',
  meltingPoint: 'Melting point',
};

export interface Filters {
  category: Category | null;
  state: Element['standardState'] | null;
  block: Element['block'] | null;
  period: number | null;
  group: number | null;
}

export interface ExploreOptions {
  query: string;
  sort: SortKey;
  descending: boolean;
  filters: Filters;
}

export const NO_FILTERS: Readonly<Filters> = {
  category: null,
  state: null,
  block: null,
  period: null,
  group: null,
};

export const DEFAULT_OPTIONS: Readonly<ExploreOptions> = {
  query: '',
  sort: 'number',
  descending: false,
  filters: NO_FILTERS,
};

export { BLOCKS, CATEGORIES, STATES };

/**
 * How well a query matches, best first. Results are grouped by tier and ordered by the chosen
 * sort inside each tier, so "ium" sorted by density lists density order, while "fe" still puts
 * iron (an exact symbol) ahead of everything that merely contains the letters.
 */
export const Tier = { Exact: 0, Prefix: 1, Contains: 2, Fuzzy: 3 } as const;
export type Tier = (typeof Tier)[keyof typeof Tier];

/** Lower-cases, trims and strips accents, so "Cæsium" and "caesium" compare alike. */
export function normalize(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** True when every character of `needle` appears in `hay` in order. */
export function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return needle.length === 0;
}

/** The tier at which `query` (already normalized) matches `e`, or null if it does not. */
export function matchTier(e: Element, query: string): Tier | null {
  if (query === '') return Tier.Exact;
  const name = normalize(e.name);
  const symbol = e.symbol.toLowerCase();
  if (query === String(e.number) || query === symbol || query === name) return Tier.Exact;
  if (name.startsWith(query) || symbol.startsWith(query) || String(e.number).startsWith(query))
    return Tier.Prefix;
  if (name.includes(query)) return Tier.Contains;
  // Fuzzy only for letters, and only from three characters on: "2" should not match "Helium".
  if (query.length >= 3 && /^\p{L}+$/u.test(query) && isSubsequence(query, name)) return Tier.Fuzzy;
  return null;
}

/** The value an element sorts by, or null when it is unknown (unknowns always sort last). */
export function sortValue(e: Element, key: SortKey): number | string | null {
  switch (key) {
    case 'name':
      return normalize(e.name);
    case 'yearDiscovered':
      return e.discoveredInAntiquity ? -Infinity : e.yearDiscovered;
    default:
      return e[key];
  }
}

function compare(a: Element, b: Element, key: SortKey, descending: boolean): number {
  const va = sortValue(a, key);
  const vb = sortValue(b, key);
  if (va === null || vb === null) {
    if (va === vb) return a.number - b.number;
    return va === null ? 1 : -1;
  }
  const order =
    typeof va === 'string' && typeof vb === 'string'
      ? va.localeCompare(vb)
      : (va as number) - (vb as number);
  if (order === 0) return a.number - b.number;
  return descending ? -order : order;
}

export function passesFilters(e: Element, f: Filters): boolean {
  return (
    (f.category === null || e.category === f.category) &&
    (f.state === null || e.standardState === f.state) &&
    (f.block === null || e.block === f.block) &&
    (f.period === null || e.period === f.period) &&
    (f.group === null || e.group === f.group)
  );
}

/** The elements the palette lists for `options`, in order. */
export function explore(elements: readonly Element[], options: ExploreOptions): Element[] {
  const query = normalize(options.query);
  const matches: { e: Element; tier: Tier }[] = [];
  for (const e of elements) {
    if (!passesFilters(e, options.filters)) continue;
    const tier = matchTier(e, query);
    if (tier !== null) matches.push({ e, tier });
  }
  matches.sort((a, b) => a.tier - b.tier || compare(a.e, b.e, options.sort, options.descending));
  return matches.map((m) => m.e);
}

/** The value shown beside each result for the chosen sort, with its unit. */
export function sortValueLabel(e: Element, key: SortKey): string {
  switch (key) {
    case 'number':
    case 'name':
      return '';
    case 'atomicMass':
      return `${formatNumber(e.atomicMass)} u`;
    case 'yearDiscovered':
      return e.discoveredInAntiquity
        ? 'Antiquity'
        : e.yearDiscovered === null
          ? UNKNOWN
          : String(e.yearDiscovered);
    case 'density':
      return formatDensity(e.density, e.standardState);
    case 'electronegativity':
      return e.electronegativity === null ? UNKNOWN : formatNumber(e.electronegativity);
    case 'meltingPoint':
      return formatTemperature(e.meltingPoint);
  }
}

/**
 * The hash for an element's deep link: `#/Au`, with the lenses that are on as a query:
 * `#/Au?lens=density` (height), `#/Au?colour=meltingPoint`, `#/Ga?t=310.15` (temperature in
 * kelvin), `#/Ne?year=1869` (discovery year, `year=antiquity` for the stop), or any mix of them.
 */
export function deepLink(
  e: Pick<Element, 'symbol'>,
  lens: string | null = null,
  colour: string | null = null,
  temperature: number | null = null,
  year: number | null = null,
  context: string | null = null,
): string {
  const query = [
    lens === null ? '' : `lens=${lens}`,
    colour === null ? '' : `colour=${colour}`,
    temperature === null ? '' : `${TEMPERATURE_PARAM}=${temperatureParam(temperature)}`,
    year === null ? '' : `${YEAR_PARAM}=${yearParam(year)}`,
    context === null ? '' : `context=${context}`,
  ]
    .filter(Boolean)
    .join('&');
  return query === '' ? `#/${e.symbol}` : `#/${e.symbol}?${query}`;
}

/**
 * The element a hash points at, or null. Accepts `#/Au`, `#/au`, `#/79` and `#/gold`, with or
 * without the slash, so hand-typed links work too. A query after `?` (the lens) is ignored here.
 */
export function parseDeepLink(hash: string, elements: readonly Element[]): Element | null {
  let key = hash.replace(/^#\/?/, '').replace(/\?.*$/, '');
  try {
    key = decodeURIComponent(key);
  } catch {
    return null;
  }
  const q = normalize(key);
  if (q === '') return null;
  return (
    elements.find(
      (e) => q === String(e.number) || q === e.symbol.toLowerCase() || q === normalize(e.name),
    ) ?? null
  );
}
