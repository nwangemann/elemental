import { describe, expect, it } from 'vitest';
import { fromColumns, toColumns } from './columns.ts';
import { COMPOUNDS } from './compounds/index.ts';
import { ELEMENTS } from './elements/index.ts';

describe('columns', () => {
  it('stores each field once and reads the same rows back', () => {
    const rows = [
      { n: 1, s: 'H', ox: [1, -1], m: null },
      { n: 2, s: 'He', ox: [], m: 0.95 },
    ];
    const columns = toColumns(rows);
    expect(columns).toEqual({ n: [1, 2], s: ['H', 'He'], ox: [[1, -1], []], m: [null, 0.95] });
    expect(fromColumns(columns)).toEqual(rows);
  });

  it('refuses an empty table, and reads empty columns as no rows', () => {
    expect(() => toColumns([])).toThrow(/No rows/);
    expect(fromColumns({})).toEqual([]);
  });

  it('round-trips the shipped tables', () => {
    expect(ELEMENTS).toHaveLength(118);
    expect(fromColumns(toColumns(ELEMENTS))).toEqual(ELEMENTS);
    expect(fromColumns(toColumns(COMPOUNDS))).toEqual(COMPOUNDS);
  });
});
