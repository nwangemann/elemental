import { z } from 'zod';
import { BLOCKS, CATEGORIES, STATES } from './categories.ts';

export { BLOCKS, CATEGORIES, STATES, type Category } from './categories.ts';

export const categorySchema = z.enum(CATEGORIES);

const nullableNumber = z.number().finite().nullable();

export const elementSchema = z
  .object({
    number: z.number().int().min(1).max(118),
    symbol: z.string().regex(/^[A-Z][a-z]?$/),
    name: z.string().min(1),
    /** Standard atomic weight in u (for unstable elements, the most stable isotope's mass). */
    atomicMass: z.number().positive(),
    period: z.number().int().min(1).max(7),
    /** 1–18, or null for the f-block (La–Yb, Ac–No). */
    group: z.number().int().min(1).max(18).nullable(),
    block: z.enum(BLOCKS),
    category: categorySchema,
    /** At room temperature and pressure. */
    standardState: z.enum(STATES),
    standardStateIsPredicted: z.boolean(),
    electronConfiguration: z.string().min(1),
    electronConfigurationIsPredicted: z.boolean(),
    /** Kelvin. */
    meltingPoint: nullableNumber,
    /** Kelvin. */
    boilingPoint: nullableNumber,
    /** g/cm³ for every state (gases are tiny numbers). */
    density: nullableNumber,
    /** Pauling scale. */
    electronegativity: nullableNumber,
    /** Picometres (van der Waals). */
    atomicRadius: nullableNumber,
    /** First ionization energy, eV. */
    ionizationEnergy: nullableNumber,
    /** eV. */
    electronAffinity: nullableNumber,
    oxidationStates: z.array(z.number().int()),
    /** null when known since antiquity. */
    yearDiscovered: z.number().int().nullable(),
    discoveredInAntiquity: z.boolean(),
    discoverers: z.array(z.string().min(1)),
    namedAfter: z.array(z.string().min(1)),
    /** CPK colour as `#rrggbb`, or null where PubChem has none. */
    cpkColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/)
      .nullable(),
    wikidataId: z.string().regex(/^Q\d+$/),
  })
  .strict();

export type Element = z.infer<typeof elementSchema>;

export const elementsSchema = z.array(elementSchema).length(118);
