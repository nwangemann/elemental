import { describe, expect, it } from 'vitest';
import { COMPOUNDS } from './compounds/index.ts';
import { artPoints, LADDERS, laddersFor } from './ladder.ts';

const ids = new Set(COMPOUNDS.map((c) => c.id));

describe('scale ladder', () => {
  it('links only compounds in the set, and each chain has one', () => {
    for (const ladder of LADDERS) {
      expect(ladder.length).toBeGreaterThanOrEqual(2);
      const linked = ladder.flatMap((r) => (r.compound ? [r.compound] : []));
      expect(linked.length).toBeGreaterThan(0);
      for (const id of linked) expect(ids).toContain(id);
    }
  });

  it('finds every chain a compound sits on', () => {
    expect(laddersFor('glucose').map((l) => l[1]!.label)).toEqual(['Starch', 'Cellulose']);
    expect(laddersFor('lime')).toHaveLength(1);
    expect(laddersFor('water')).toEqual([]);
  });

  it('keeps the copy to one short line', () => {
    for (const r of LADDERS.flat()) {
      expect(r.label.length).toBeLessThanOrEqual(20);
      expect(r.line.length).toBeLessThanOrEqual(50);
      expect(r.line).toMatch(/\.$/);
    }
  });

  it('places every unit inside the picture, the same way every time', () => {
    for (const r of LADDERS.flat()) {
      const pts = artPoints(r);
      expect(pts.length).toBeGreaterThan(0);
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(1);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(1);
      }
      expect(artPoints(r)).toEqual(pts);
    }
  });

  it('grows from one unit to many up a chain', () => {
    for (const ladder of LADDERS)
      expect(artPoints(ladder[0]!).length).toBeLessThanOrEqual(artPoints(ladder.at(-1)!).length);
  });

  it('marks the other element only in alloys', () => {
    expect(artPoints({ layout: 'block' }).some((p) => p[2] === 1)).toBe(false);
    expect(artPoints({ layout: 'block', mixed: true }).filter((p) => p[2] === 1).length).toBe(3);
  });
});
