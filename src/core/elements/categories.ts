/**
 * The fixed value lists behind the element schema, kept free of zod so the app can import them
 * without shipping the validator. `schema.ts` builds its enums from these.
 */

/** Element families. They drive tile colours and, later, the theme of each tile. */
export const CATEGORIES = [
  'alkali',
  'alkaline-earth',
  'transition',
  'post-transition',
  'metalloid',
  'nonmetal',
  'halogen',
  'noble-gas',
  'lanthanide',
  'actinide',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATES = ['solid', 'liquid', 'gas'] as const;
export const BLOCKS = ['s', 'p', 'd', 'f'] as const;
