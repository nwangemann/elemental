// Combine mode's matching (ADR 20): what the carried atoms make, what they could still
// make, and how far each tile leads. Curated, not simulated: a compound forms only when the
// counts match it exactly, and an alloy when the set of elements matches. Pure: the store
// (8.4) owns what is carried and in which order; the compound list comes in as an argument.
import type { Compound } from './compounds/index.ts';
import { CARRY_LIMIT } from './compounds/source.ts';

/** What the figure carries: element symbol → count (every count ≥ 1). */
export type Carried = ReadonlyMap<string, number>;

/** One compound's distance from what is carried. Alloys count each missing element once. */
export interface NearMiss {
  compound: Compound;
  /** Atoms to add, by element. */
  missing: Map<string, number>;
  /** Atoms to drop, by element (empty when the carry is part of the compound). */
  extra: Map<string, number>;
  /** Total atoms in `missing`. */
  atomsMissing: number;
  /** Total atoms in `extra`. */
  atomsExtra: number;
}

/** A compound whose elements are exactly the carried ones, in other numbers, and the fix. */
export interface WrongAmounts {
  compound: Compound;
  /** The counts that Fill in sets. */
  fill: Map<string, number>;
  /** The smallest whole-number ratio ("1 carbon, 2 hydrogen, 1 oxygen") … */
  unit: Map<string, number>;
  /** … and how many times over it repeats (6 for glucose). */
  times: number;
}

export type CarryCheck = 'ok' | 'too-many-elements' | 'too-many-atoms';

const COUNTS = new WeakMap<Compound, ReadonlyMap<string, number | null>>();

/** A compound's element counts (null counts for alloys), cached per compound. */
export function countsOf(compound: Compound): ReadonlyMap<string, number | null> {
  let counts = COUNTS.get(compound);
  if (!counts) {
    counts = new Map(compound.elements.map((e) => [e.symbol, e.count]));
    COUNTS.set(compound, counts);
  }
  return counts;
}

/** Total atoms carried. */
export function atomsIn(carried: Carried): number {
  let n = 0;
  for (const count of carried.values()) n += count;
  return n;
}

/** Whether one more `symbol` fits the carry limit (5 elements, 24 atoms). */
export function canAdd(carried: Carried, symbol: string): CarryCheck {
  if (!carried.has(symbol) && carried.size >= CARRY_LIMIT.elements) return 'too-many-elements';
  if (atomsIn(carried) >= CARRY_LIMIT.atoms) return 'too-many-atoms';
  return 'ok';
}

/** Whether a count map fits the carry limit, as Fill in must before it sets counts. */
export function fitsCarry(counts: ReadonlyMap<string, number>): boolean {
  return counts.size <= CARRY_LIMIT.elements && atomsIn(counts) <= CARRY_LIMIT.atoms;
}

const sameSet = (a: ReadonlyMap<string, unknown>, b: ReadonlyMap<string, unknown>) =>
  a.size === b.size && [...a.keys()].every((symbol) => b.has(symbol));

/** True when the carried atoms are exactly this compound (an alloy: exactly its elements). */
export function matches(carried: Carried, compound: Compound): boolean {
  const counts = countsOf(compound);
  if (!sameSet(carried, counts)) return false;
  return compound.kind === 'alloy' || [...counts].every(([s, n]) => carried.get(s) === n);
}

/**
 * Every compound the carried atoms make right now, in everyday order. Several when one
 * formula is several molecules (ethanol and dimethyl ether): the tray offers each.
 */
export function exactMatches(carried: Carried, compounds: readonly Compound[]): Compound[] {
  if (carried.size === 0) return [];
  return compounds.filter((c) => matches(carried, c)).toSorted((a, b) => a.rank - b.rank);
}

/** The atoms carried beyond one unit of `compound`, which stay carried after it forms. */
export function leftover(carried: Carried, compound: Compound): Map<string, number> {
  const counts = countsOf(compound);
  const out = new Map<string, number>();
  for (const [symbol, n] of carried) {
    const used = counts.has(symbol) ? (counts.get(symbol) ?? n) : 0;
    if (n > used) out.set(symbol, n - used);
  }
  return out;
}

/** How far the carried atoms are from `compound`: atoms to add and atoms to drop. */
export function distance(carried: Carried, compound: Compound): NearMiss {
  const counts = countsOf(compound);
  const missing = new Map<string, number>();
  const extra = new Map<string, number>();
  for (const [symbol, need] of counts) {
    const have = carried.get(symbol) ?? 0;
    const short = need === null ? (have === 0 ? 1 : 0) : need - have;
    if (short > 0) missing.set(symbol, short);
  }
  for (const [symbol, have] of carried) {
    const need = counts.has(symbol) ? (counts.get(symbol) ?? have) : 0;
    if (have > need) extra.set(symbol, have - need);
  }
  return {
    compound,
    missing,
    extra,
    atomsMissing: atomsIn(missing),
    atomsExtra: atomsIn(extra),
  };
}

/**
 * The compounds nearest the carried atoms, for the tray. Fewest atoms to drop first (zero
 * when the carry is part of the compound), then fewest to add, then the most everyday.
 * Leaves out exact matches, compounds too big to carry (Show me only), and compounds that
 * share no element with the carry. Empty when nothing is carried: the tray shows starters.
 */
export function nearest(carried: Carried, compounds: readonly Compound[], limit = 3): NearMiss[] {
  if (carried.size === 0) return [];
  const out: NearMiss[] = [];
  for (const c of compounds) {
    if (!c.carryable || matches(carried, c)) continue;
    const counts = countsOf(c);
    if (![...carried.keys()].some((s) => counts.has(s))) continue;
    out.push(distance(carried, c));
  }
  out.sort(
    (a, b) =>
      a.atomsExtra - b.atomsExtra ||
      a.atomsMissing - b.atomsMissing ||
      a.compound.rank - b.compound.rank,
  );
  return out.slice(0, limit);
}

/**
 * True when no compound in the set holds every carried atom: the tray says "Nothing in the
 * set forms from just these" and still lists `nearest`. Never a dead end.
 */
export function nothingForms(carried: Carried, compounds: readonly Compound[]): boolean {
  if (carried.size === 0) return false;
  return !compounds.some((c) => c.carryable && distance(carried, c).atomsExtra === 0);
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Compounds made of exactly the carried elements but in other numbers ("right elements,
 * wrong amounts"), with the counts Fill in sets and the ratio the tray teaches. Alloys never
 * appear (any amounts make them), nor compounds too big to carry. Closest counts first.
 */
export function wrongAmounts(carried: Carried, compounds: readonly Compound[]): WrongAmounts[] {
  if (carried.size === 0) return [];
  const found: { item: WrongAmounts; off: number }[] = [];
  for (const c of compounds) {
    if (c.kind === 'alloy' || !c.carryable) continue;
    const counts = countsOf(c);
    if (!sameSet(carried, counts) || matches(carried, c)) continue;
    const fill = new Map([...counts].map(([s, n]) => [s, n!]));
    const times = [...fill.values()].reduce(gcd);
    const unit = new Map([...fill].map(([s, n]) => [s, n / times]));
    let off = 0;
    for (const [s, n] of fill) off += Math.abs(n - carried.get(s)!);
    found.push({ item: { compound: c, fill, unit, times }, off });
  }
  found.sort((a, b) => a.off - b.off || a.item.compound.rank - b.item.compound.rank);
  return found.map((f) => f.item);
}

/**
 * Per-tile suggestion weights (0–1, one per element in `symbols` order) for the table's
 * dimming: how much picking that element up leads somewhere. Each carryable compound the
 * carry is still part of adds its everyday weight to every element it still needs, so an
 * element that completes many everyday compounds is brightest. With nothing carried, every
 * carryable compound counts. 0 means picking it up leads nowhere in the set, or the carry
 * limit stops it being picked up.
 */
export function suggestionWeights(
  carried: Carried,
  compounds: readonly Compound[],
  symbols: readonly string[],
  out: Float32Array,
): Float32Array {
  const score = new Map<string, number>();
  const n = compounds.length;
  for (const c of compounds) {
    if (!c.carryable) continue;
    const d = distance(carried, c);
    if (d.atomsExtra > 0) continue;
    const everyday = (n + 1 - c.rank) / n;
    for (const symbol of d.missing.keys()) score.set(symbol, (score.get(symbol) ?? 0) + everyday);
  }
  let max = 0;
  for (const s of score.values()) max = Math.max(max, s);
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]!;
    const s = canAdd(carried, symbol) === 'ok' ? (score.get(symbol) ?? 0) : 0;
    out[i] = max > 0 ? s / max : 0;
  }
  return out;
}
