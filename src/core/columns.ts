// Generated tables (elements, compounds) are stored by column, not as a list of objects: each
// field name is written once instead of once per row, which makes the shipped JSON about a
// quarter smaller gzipped (ADR 3). The data scripts write columns; the app reads rows back.

/** A table stored by column: one array per field, all the same length. */
export type Columns<T> = { [K in keyof T]: T[K][] };

/** Turns rows into columns, keeping the first row's field order. */
export function toColumns<T extends object>(rows: readonly T[]): Columns<T> {
  const first = rows[0];
  if (!first) throw new Error('No rows to store');
  const keys = Object.keys(first) as (keyof T)[];
  return Object.fromEntries(keys.map((k) => [k, rows.map((r) => r[k])])) as Columns<T>;
}

/** Turns columns back into rows, in order, each with the fields in column order. */
export function fromColumns<T>(columns: Columns<T>): T[] {
  const keys = Object.keys(columns) as (keyof T)[];
  const length = keys.length ? columns[keys[0]!].length : 0;
  return Array.from(
    { length },
    (_, i) => Object.fromEntries(keys.map((k) => [k, columns[k][i]])) as T,
  );
}
