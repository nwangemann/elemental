import type { BLOCKS } from './schema.ts';

export interface Position {
  period: number;
  /** 1–18, or null for the f-block. */
  group: number | null;
  block: (typeof BLOCKS)[number];
}

/** Last atomic number of each period. */
const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118] as const;

/**
 * Period, group and block from the atomic number alone.
 *
 * Follows the IUPAC layout with Lu and Lr in group 3, so the f-block rows are La–Yb and Ac–No
 * (14 each), whose group is null.
 */
export function positionOf(z: number): Position {
  if (!Number.isInteger(z) || z < 1 || z > 118) throw new RangeError(`No element ${z}`);
  const periodIndex = PERIOD_ENDS.findIndex((end) => z <= end);
  const period = periodIndex + 1;
  const start = periodIndex === 0 ? 1 : PERIOD_ENDS[periodIndex - 1]! + 1;
  const i = z - start;

  let group: number | null;
  if (period === 1) group = z === 1 ? 1 : 18;
  else if (period <= 3) group = i < 2 ? i + 1 : i + 11;
  else if (period <= 5) group = i + 1;
  else if (i < 2) group = i + 1;
  else if (i < 16) group = null;
  else group = i - 13;

  return { period, group, block: blockOf(z, group) };
}

function blockOf(z: number, group: number | null): Position['block'] {
  if (group === null) return 'f';
  if (z === 2 || group <= 2) return 's';
  if (group <= 12) return 'd';
  return 'p';
}
