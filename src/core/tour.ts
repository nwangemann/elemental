// Show me (ADR 20): a tour that takes the figure to each of a compound's elements in formula
// order and picks up its atoms there, so the compound forms over the figure as if the visitor
// had walked it. Pure: the stops and how to reach each; the tray runs the tour.
import type { Compound } from './compounds/index.ts';

/** One stop: the tile to reach and how many atoms to pick up there. */
export interface TourStop {
  symbol: string;
  number: number;
  pick: number;
}

/**
 * The stops for a compound, in formula order. A compound you can carry picks up its exact
 * counts (an alloy, which has none, one atom of each). One too big to carry (sucrose's 45 atoms)
 * picks up one of each, so the walk still draws the recipe; the card then says why it can't form.
 */
export function tourStops(
  compound: Compound,
  numbers: ReadonlyMap<string, { number: number }>,
): TourStop[] {
  const exact = compound.carryable;
  return compound.elements.flatMap((e) => {
    const number = numbers.get(e.symbol)?.number;
    if (number === undefined) return [];
    return [{ symbol: e.symbol, number, pick: exact ? (e.count ?? 1) : 1 }];
  });
}

/** How the figure gets to the next stop: a walk when it is close, otherwise a flight. */
export type TourMove = 'here' | 'walk' | 'fly';

/** Tiles further apart than this (world units, about four tiles) are flown to, not walked. */
export const WALK_REACH = 4.7;

/**
 * Walk to a nearby tile, so the tour reads as the figure gathering; fly to a far one (the
 * explorer's fly-to), so a tour across the table stays short. Reduced motion always flies, which
 * cuts straight there.
 */
export function tourMove(
  from: { x: number; z: number } | null,
  to: { x: number; z: number },
  reducedMotion: boolean,
): TourMove {
  if (from && from.x === to.x && from.z === to.z) return 'here';
  if (reducedMotion || !from) return 'fly';
  return Math.hypot(to.x - from.x, to.z - from.z) <= WALK_REACH ? 'walk' : 'fly';
}
