import data from '../../data/elements.json' with { type: 'json' };
import type { Element } from './schema.ts';

export { CATEGORIES, type Category, type Element } from './schema.ts';

/** All 118 elements, sorted by atomic number. Validated by tests, not at runtime. */
export const ELEMENTS = data as Element[];

export function elementByNumber(number: number): Element | undefined {
  return ELEMENTS[number - 1];
}
