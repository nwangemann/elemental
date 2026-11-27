import { ELEMENTS } from '../core/elements/index.ts';
import { CATEGORY_COLORS } from '../core/palette.ts';
// Only the colour table: the shapes in the same file load with the formed model.
import { cpk } from '../data/compound-shapes.json';

const CPK: Readonly<Record<string, string>> = cpk;
const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e]));

/** An atom's colour: CPK where the compound set has it, else the element's family colour. */
export function orbColour(symbol: string): string {
  const e = BY_SYMBOL.get(symbol);
  return CPK[symbol] ?? (e ? CATEGORY_COLORS[e.category] : '#ffffff');
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
