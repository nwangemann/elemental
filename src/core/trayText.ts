// The Combine tray's words (ADR 20): one sentence for what is carried and one for where it
// leads, read out by the tray's live region ("Carrying H 2. Could become water with one O.").
// Pure: the tray passes the carried counts and the compound list in.
import type { Compound } from './compounds/index.ts';
import { CARRY_LIMIT, type CarryCheck } from './carry.ts';
import {
  exactMatches,
  nearest,
  nothingForms,
  type Carried,
  type NearMiss,
  type WrongAmounts,
} from './combine.ts';

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

/** A count in words up to ten, digits after ("two", "24"). */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/** "a", "a and b", "a, b and c" (or "or" in place of "and"). */
export function listOf(items: readonly string[], last: 'and' | 'or' = 'and'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${last} ${items.at(-1)}`;
}

/** A compound's name inside a sentence: "Table salt" → "table salt". */
export function nameInSentence(compound: Compound): string {
  return compound.name.charAt(0).toLowerCase() + compound.name.slice(1);
}

/** "H 2, O 1": what is carried, symbol then count, in the order first picked up. */
export function carryLine(carried: Carried): string {
  return [...carried].map(([symbol, n]) => `${symbol} ${n}`).join(', ');
}

const atoms = (counts: ReadonlyMap<string, number>) =>
  listOf([...counts].map(([symbol, n]) => `${countWord(n)} ${symbol}`));

/** "Try water, table salt or carbon dioxide." for an empty tray. */
export function startersLine(starters: readonly Compound[]): string {
  return `Try ${listOf(starters.map(nameInSentence), 'or')}.`;
}

/** Why the carry limit refused a pick-up, in words. */
export function refusalLine(symbol: string, reason: Exclude<CarryCheck, 'ok'>): string {
  return reason === 'too-many-elements'
    ? `Can't pick up ${symbol}: you can carry ${countWord(CARRY_LIMIT.elements)} elements at most.`
    : `Can't pick up ${symbol}: you can carry ${countWord(CARRY_LIMIT.atoms)} atoms at most.`;
}

/**
 * Where the carried atoms lead: what they make now ("Makes water."), and the nearest bigger
 * compound when there is one ("Makes hydrogen gas. Could become water with one O."), else the nearest
 * compound and the atoms to add or drop ("Could become water with one O."), with "Nothing in
 * the set forms from just these." first when no compound holds every carried atom.
 */
export function leadsLine(carried: Carried, compounds: readonly Compound[]): string {
  const made = exactMatches(carried, compounds);
  const [near] = nearest(carried, compounds, 1);
  if (made.length > 0) {
    const now = `Makes ${listOf(made.map(nameInSentence), 'or')}`;
    return near && near.atomsExtra === 0
      ? `${now}. Could become ${nameInSentence(near.compound)} with ${atoms(near.missing)}.`
      : `${now}.`;
  }
  const parts: string[] = [];
  if (nothingForms(carried, compounds)) parts.push('Nothing in the set forms from just these.');
  if (near) {
    const name = nameInSentence(near.compound);
    if (near.atomsExtra === 0) parts.push(`Could become ${name} with ${atoms(near.missing)}.`);
    else if (near.atomsMissing === 0)
      parts.push(`Could become ${name} by dropping ${atoms(near.extra)}.`);
    else
      parts.push(
        `Could become ${name} by dropping ${atoms(near.extra)} and adding ${atoms(near.missing)}.`,
      );
  }
  return parts.join(' ');
}

/** The tray's whole live-region text: a refusal if any, then what is carried and where it leads. */
export function traySummary(
  carried: Carried,
  compounds: readonly Compound[],
  refused: { symbol: string; reason: Exclude<CarryCheck, 'ok'> } | null = null,
): string {
  const parts: string[] = [];
  if (refused) parts.push(refusalLine(refused.symbol, refused.reason));
  if (carried.size === 0) {
    parts.push('Carrying nothing.', startersLine(compounds.filter((c) => c.starter)));
  } else {
    parts.push(`Carrying ${carryLine(carried)}.`);
    const leads = leadsLine(carried, compounds);
    if (leads) parts.push(leads);
  }
  return parts.join(' ');
}

/** One nearest compound for the tray's list: "Water — 1 more H", "Water — 1 fewer C, 1 more O". */
export function nearMissLine(near: NearMiss): string {
  const steps = [
    ...[...near.extra].map(([symbol, n]) => `${n} fewer ${symbol}`),
    ...[...near.missing].map(([symbol, n]) => `${n} more ${symbol}`),
  ];
  return `${near.compound.name} — ${steps.join(', ')}`;
}

/**
 * "Right elements, wrong amounts", teaching the ratio: "Glucose is C₆H₁₂O₆: 1 carbon,
 * 2 hydrogen, 1 oxygen, six times over." (`names` maps a symbol to its lower-case name.)
 */
export function ratioLine(wrong: WrongAmounts, names: ReadonlyMap<string, string>): string {
  const unit = [...wrong.unit].map(([symbol, n]) => `${n} ${names.get(symbol) ?? symbol}`);
  const over = wrong.times > 1 ? `, ${countWord(wrong.times)} times over` : '';
  return `${wrong.compound.name} is ${wrong.compound.formula}: ${unit.join(', ')}${over}.`;
}
