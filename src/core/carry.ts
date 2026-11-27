// What the figure carries in combine mode (ADR 20): one entry per atom, in the order they
// were picked up, so counts come from the list and Backspace drops the last one. Kept apart
// from the compound data so the shell's store can use it without loading combine's chunk.

/** What one person can carry at once: glucose (24 atoms) fits, sucrose (45) is Show me only. */
export const CARRY_LIMIT = { elements: 5, atoms: 24 } as const;

/** Element symbols, one per carried atom, oldest first. */
export type Carry = readonly string[];

/** Why an atom could not be picked up, or 'ok'. */
export type CarryCheck = 'ok' | 'too-many-elements' | 'too-many-atoms';

/** Counts by element, in the order each element was first picked up (the orbs' order). */
export function carriedCounts(carry: Carry): Map<string, number> {
  const counts = new Map<string, number>();
  for (const symbol of carry) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  return counts;
}

/** Total atoms in a count map. */
export function atomsIn(counts: ReadonlyMap<string, number>): number {
  let n = 0;
  for (const count of counts.values()) n += count;
  return n;
}

/** Whether one more `symbol` fits the carry limit (5 elements, 24 atoms). */
export function canAdd(counts: ReadonlyMap<string, number>, symbol: string): CarryCheck {
  if (!counts.has(symbol) && counts.size >= CARRY_LIMIT.elements) return 'too-many-elements';
  if (atomsIn(counts) >= CARRY_LIMIT.atoms) return 'too-many-atoms';
  return 'ok';
}

/** Whether a count map fits the carry limit, as Fill in must before it sets counts. */
export function fitsCarry(counts: ReadonlyMap<string, number>): boolean {
  return counts.size <= CARRY_LIMIT.elements && atomsIn(counts) <= CARRY_LIMIT.atoms;
}

/** The carry with one more `symbol`, or the same carry when the limit refuses it. */
export function pickUp(carry: Carry, symbol: string): Carry {
  return canAdd(carriedCounts(carry), symbol) === 'ok' ? [...carry, symbol] : carry;
}

/** The carry without its last atom (Backspace). */
export function dropLast(carry: Carry): Carry {
  return carry.length === 0 ? carry : carry.slice(0, -1);
}

/** The carry without the most recent atom of `symbol` (a tray stepper's −). */
export function dropOne(carry: Carry, symbol: string): Carry {
  const i = carry.lastIndexOf(symbol);
  return i < 0 ? carry : [...carry.slice(0, i), ...carry.slice(i + 1)];
}

/**
 * A carry holding exactly `counts` (Fill in), keeping the elements already carried in their
 * order, or the same carry when the counts break the limit.
 */
export function withCounts(carry: Carry, counts: ReadonlyMap<string, number>): Carry {
  if (!fitsCarry(counts)) return carry;
  const order = [...new Set([...carry.filter((s) => counts.has(s)), ...counts.keys()])];
  return order.flatMap((symbol) => Array<string>(counts.get(symbol) ?? 0).fill(symbol));
}
