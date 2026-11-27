// The compound card and the recently made list (ADR 20). Pure: the card's words and links,
// and the list's edits and parsing; the tray stores the list (localStorage) and draws the card.
import type { Bond, Compound } from './compounds/index.ts';

/** The bond chip's words, plain enough to need no gloss. */
export const BOND_LABELS: Record<Bond, string> = {
  shares: 'Shares electrons',
  transfers: 'Hands electrons over',
  metal: 'Metal mix',
  none: 'Stays on its own',
};

/** One "Made of" chip: the element, its tile number and how many atoms (null for an alloy). */
export interface MadeOf {
  symbol: string;
  name: string;
  number: number;
  count: number | null;
}

/** The card's Made of chips, in formula order. `numbers` maps a symbol to its atomic number. */
export function madeOf(
  compound: Compound,
  numbers: ReadonlyMap<string, { number: number; name: string }>,
): MadeOf[] {
  return compound.elements.flatMap((e) => {
    const el = numbers.get(e.symbol);
    return el ? [{ symbol: e.symbol, name: el.name, number: el.number, count: e.count }] : [];
  });
}

/** A "Leads to" item: plain words, or a compound in the set whose card it opens. */
export interface LeadsTo {
  text: string;
  compound: Compound | null;
}

/** The card's Leads to items; an item naming a compound in the set links to its card. */
export function leadsTo(compound: Compound, compounds: readonly Compound[]): LeadsTo[] {
  const byName = new Map(compounds.map((c) => [c.name.toLowerCase(), c]));
  return compound.leadsTo.map((text) => ({
    text,
    compound: byName.get(text.toLowerCase()) ?? null,
  }));
}

/** The compounds with the same atoms in another shape (ethanol and dimethyl ether), for links. */
export function isomersOf(compound: Compound, compounds: readonly Compound[]): Compound[] {
  return compound.isomers.flatMap((id) => compounds.find((c) => c.id === id) ?? []);
}

/** How many compounds Recently made keeps. */
export const RECENT_LIMIT = 8;

/** Recently made with `id` at the front: no duplicates, at most `RECENT_LIMIT`. */
export function addRecent(recent: readonly string[], id: string): string[] {
  if (recent[0] === id) return recent as string[];
  return [id, ...recent.filter((r) => r !== id)].slice(0, RECENT_LIMIT);
}

/**
 * Recently made from stored text: only known ids, no duplicates, at most `RECENT_LIMIT`. Anything
 * unreadable (old format, hand-edited, another app's key) gives an empty list, never an error.
 */
export function parseRecent(stored: string | null, known: ReadonlySet<string>): string[] {
  if (!stored) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((r): r is string => typeof r === 'string' && known.has(r));
  return [...new Set(ids)].slice(0, RECENT_LIMIT);
}
