import data from '../../data/elements.json' with { type: 'json' };
import type { Element } from './schema.ts';

// Runtime values come from zod-free modules; the schema contributes types only, so zod stays
// out of the app bundle (it is used by the data script and tests).
export { CATEGORIES, type Category } from './categories.ts';
export type { Element } from './schema.ts';

/** All 118 elements, sorted by atomic number. Validated by tests, not at runtime. */
export const ELEMENTS = data as Element[];

export function elementByNumber(number: number): Element | undefined {
  return ELEMENTS[number - 1];
}
