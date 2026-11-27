import { formatNumber, type Fact } from './elementFacts.ts';
import type { Element } from './elements/schema.ts';

/**
 * Panel depth: where an element stands among the others. `rankFacts` finds the properties it
 * leads or trails in ("3rd densest of all elements", "highest melting point in period 6"), and
 * `comparison` sets it against the previous tile by the most striking ratio. Pure, so the wording
 * and the choices are unit-tested.
 */

/** Properties worth ranking, with the words for each end. */
const RANKED = {
  density: { most: 'densest', least: 'least dense' },
  meltingPoint: { most: 'highest melting point', least: 'lowest melting point' },
  boilingPoint: { most: 'highest boiling point', least: 'lowest boiling point' },
  electronegativity: { most: 'most electronegative', least: 'least electronegative' },
  atomicRadius: { most: 'largest atom', least: 'smallest atom' },
  ionizationEnergy: {
    most: 'highest ionization energy',
    least: 'lowest ionization energy',
  },
} as const;
type RankKey = keyof typeof RANKED;
const RANK_KEYS = Object.keys(RANKED) as RankKey[];

/** Ranks within the whole table count up to this; beyond it only a period or group lead counts. */
export const TABLE_RANKS = 3;
/** A period or group needs this many known values before leading it means anything. */
export const MIN_SCOPE = 3;
/** At most this many rank lines, table ranks first. */
export const MAX_RANK_FACTS = 3;

/** "1st", "2nd", "3rd", "11th", "22nd". */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['st', 'nd', 'rd'][(n % 10) - 1] ?? 'th');
  return `${String(n)}${suffix}`;
}

/**
 * 1 + how many elements in `scope` beat `e` on `key` (higher for 'most', lower for 'least'), and
 * how many in the scope have a value. Rank is null when `e`'s value is unknown.
 */
function rank(
  e: Element,
  scope: readonly Element[],
  key: RankKey,
  end: 'most' | 'least',
): { rank: number | null; known: number } {
  const v = e[key];
  let better = 0;
  let known = 0;
  for (const o of scope) {
    const w = o[key];
    if (w === null) continue;
    known++;
    if (v !== null && (end === 'most' ? w > v : w < v)) better++;
  }
  return { rank: v === null ? null : better + 1, known };
}

/** Rank lines for `e` among `elements`: whole-table ranks, then period leads, then group leads. */
export function rankFacts(e: Element, elements: readonly Element[]): string[] {
  const table: string[] = [];
  const inPeriod: string[] = [];
  const inGroup: string[] = [];
  const period = elements.filter((o) => o.period === e.period);
  const group = e.group === null ? [] : elements.filter((o) => o.group === e.group);
  for (const key of RANK_KEYS) {
    for (const end of ['most', 'least'] as const) {
      const word = RANKED[key][end];
      const all = rank(e, elements, key, end);
      if (all.rank !== null && all.rank <= TABLE_RANKS) {
        table.push(`${all.rank === 1 ? '' : `${ordinal(all.rank)} `}${word} of all elements`);
        continue;
      }
      const p = rank(e, period, key, end);
      if (p.rank === 1 && p.known >= MIN_SCOPE) {
        inPeriod.push(`${word} in period ${String(e.period)}`);
        continue;
      }
      const g = rank(e, group, key, end);
      if (g.rank === 1 && g.known >= MIN_SCOPE) inGroup.push(`${word} in group ${String(e.group)}`);
    }
  }
  const lines = [...table, ...inPeriod, ...inGroup].slice(0, MAX_RANK_FACTS);
  return lines.map((l) => l.charAt(0).toUpperCase() + l.slice(1));
}

/** Properties a comparison may use, with the comparative for more and for less. */
const COMPARED = {
  atomicMass: { more: 'heavier', less: 'lighter' },
  density: { more: 'denser', less: 'less dense' },
  meltingPoint: { more: 'higher melting point', less: 'lower melting point' },
  boilingPoint: { more: 'higher boiling point', less: 'lower boiling point' },
  electronegativity: { more: 'more electronegative', less: 'less electronegative' },
  atomicRadius: { more: 'larger atom', less: 'smaller atom' },
  ionizationEnergy: { more: 'higher ionization energy', less: 'lower ionization energy' },
} as const;
type CompareKey = keyof typeof COMPARED;

/** Below this ratio nothing is striking enough to say. */
export const MIN_RATIO = 1.1;

/**
 * One line setting `e` against `other` (the tile before): the property where the two differ by the
 * largest ratio, as "2.6× denser". Null for the same element, or when nothing differs by
 * `MIN_RATIO`. Temperatures compare in kelvin, which the note says.
 */
export function comparison(e: Element, other: Element): Fact | null {
  if (e.number === other.number) return null;
  let best: { key: CompareKey; ratio: number; more: boolean } | null = null;
  for (const key of Object.keys(COMPARED) as CompareKey[]) {
    const a = e[key];
    const b = other[key];
    if (a === null || b === null || a <= 0 || b <= 0) continue;
    const ratio = Math.max(a, b) / Math.min(a, b);
    if (!best || ratio > best.ratio) best = { key, ratio, more: a > b };
  }
  if (!best || best.ratio < MIN_RATIO) return null;
  const words = COMPARED[best.key];
  const fact: Fact = {
    label: `Compared with ${other.name}`,
    value: `${formatNumber(best.ratio, 2)}× ${best.more ? words.more : words.less}`,
  };
  return best.key === 'meltingPoint' || best.key === 'boilingPoint'
    ? { ...fact, note: 'in kelvin' }
    : fact;
}
