// Turns the curated list (source.ts) and PubChem's rows into validated compounds (ADR 20).
// Used by the data script and its tests; the app reads the committed compounds.json.
import { z } from 'zod';
import { parseFormula } from './formula.ts';
import { CARRY_LIMIT, CONTEXTS, type CompoundSource } from './source.ts';

export { parseFormula };

export { CARRY_LIMIT };

/** One row of PubChem's PUG-REST property table, as the script fetches it. */
export interface PubChemCompoundRow {
  CID: number;
  MolecularFormula: string;
}

/** True when two count maps hold the same elements in the same numbers, in any order. */
export function sameCounts(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): boolean {
  return a.size === b.size && [...a].every(([symbol, n]) => b.get(symbol) === n);
}

const symbol = z.string().regex(/^[A-Z][a-z]?$/);

export const compoundSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: z.string().min(1),
    formula: z.string().min(1),
    /** PubChem compound ID; null for alloys. */
    cid: z.number().int().positive().nullable(),
    kind: z.enum(['molecule', 'lattice', 'alloy', 'atom']),
    bond: z.enum(['shares', 'transfers', 'metal', 'none']),
    /** 1 is the most everyday; suggestions break ties by it. */
    rank: z.number().int().positive(),
    contexts: z.array(z.enum(CONTEXTS)),
    starter: z.boolean(),
    /** In display order. Counts are null for alloys, which match by the set of elements. */
    elements: z
      .array(z.object({ symbol, count: z.number().int().positive().nullable() }).strict())
      .min(1),
    /** Total atoms in one unit (one formula unit for lattices); null for alloys. */
    atoms: z.number().int().positive().nullable(),
    /** False when over CARRY_LIMIT: the card offers Show me only. */
    carryable: z.boolean(),
    /** Ids of other compounds with the same counts (ethanol and dimethyl ether). */
    isomers: z.array(z.string()),
    leadsTo: z.array(z.string().min(1)).min(1).max(2),
    where: z.string().min(1).max(160),
    why: z.string().min(1).max(200),
    note: z.string().min(1).max(200).nullable(),
  })
  .strict();

export type Compound = z.infer<typeof compoundSchema>;

export const compoundsSchema = z.array(compoundSchema).min(1);

/**
 * Merges the curated list with PubChem's rows (keyed by compound id). Fails if a display
 * formula disagrees with PubChem's, if a non-alloy has no row, or if ids repeat.
 */
export function buildCompounds(
  sources: readonly CompoundSource[],
  pubchem: ReadonlyMap<string, PubChemCompoundRow>,
): Compound[] {
  const ids = new Set<string>();
  const counted = sources.map((s) => {
    if (ids.has(s.id)) throw new Error(`Duplicate compound id ${s.id}`);
    ids.add(s.id);
    if (s.kind === 'alloy') {
      if (s.pubchem) throw new Error(`Alloy ${s.id} should have no PubChem record`);
      const symbols = s.formula.split(' + ');
      for (const sym of symbols)
        if (!symbol.safeParse(sym).success) throw new Error(`Bad alloy element ${sym} in ${s.id}`);
      return { s, counts: null, symbols, cid: null };
    }
    const counts = parseFormula(s.formula);
    const row = pubchem.get(s.id);
    if (!row) throw new Error(`No PubChem row for ${s.id}`);
    if (!sameCounts(counts, parseFormula(row.MolecularFormula)))
      throw new Error(
        `${s.id}: ${s.formula} disagrees with PubChem CID ${row.CID} (${row.MolecularFormula})`,
      );
    if ((s.kind === 'atom') !== (counts.size === 1 && [...counts.values()][0] === 1))
      throw new Error(`${s.id}: kind "atom" is for one lone atom`);
    return { s, counts, symbols: [...counts.keys()], cid: row.CID };
  });

  return counted.map(({ s, counts, symbols, cid }, i) => {
    const atoms = counts ? [...counts.values()].reduce((a, b) => a + b, 0) : null;
    return compoundSchema.parse({
      id: s.id,
      name: s.name,
      formula: s.formula,
      cid,
      kind: s.kind,
      bond: s.bond,
      rank: i + 1,
      contexts: s.contexts,
      starter: s.starter ?? false,
      elements: symbols.map((sym) => ({ symbol: sym, count: counts?.get(sym) ?? null })),
      atoms,
      carryable: symbols.length <= CARRY_LIMIT.elements && (atoms ?? 0) <= CARRY_LIMIT.atoms,
      isomers: counted
        .filter((o) => o.s.id !== s.id && counts && o.counts && sameCounts(counts, o.counts))
        .map((o) => o.s.id),
      leadsTo: s.leadsTo,
      where: s.where,
      why: s.why,
      note: s.note ?? null,
    });
  });
}

export function validateCompounds(data: unknown): Compound[] {
  return compoundsSchema.parse(data);
}
