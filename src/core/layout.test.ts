import { describe, expect, it } from 'vitest';
import {
  COLS,
  LAYOUT,
  PITCH,
  ROWS,
  TABLE_SIZE,
  TILES,
  cellOf,
  tileAtCell,
  tileAtPoint,
  worldToCol,
  worldToRow,
} from './layout.ts';

const tile = (z: number) => TILES[z - 1]!;

describe('cellOf', () => {
  it.each([
    [1, 0, 0],
    [2, 17, 0],
    [26, 7, 3],
    [56, 1, 5],
    [71, 2, 5],
    [118, 17, 6],
    [57, 2, 8],
    [70, 15, 8],
    [89, 2, 9],
    [102, 15, 9],
  ] as const)('element %i is at column %i, row %i', (z, col, row) => {
    expect(cellOf(z)).toEqual({ col, row });
  });

  it('gives every element its own cell inside the grid', () => {
    const cells = new Set(TILES.map((t) => t.row * COLS + t.col));
    expect(cells.size).toBe(118);
    for (const t of TILES) {
      expect(t.col).toBeGreaterThanOrEqual(0);
      expect(t.col).toBeLessThan(COLS);
      expect(t.row).toBeGreaterThanOrEqual(0);
      expect(t.row).toBeLessThan(ROWS);
    }
  });

  it('leaves the row between the main table and the f-block empty', () => {
    expect(TILES.filter((t) => t.row === 7)).toHaveLength(0);
  });
});

describe('world coordinates', () => {
  it('centres the table on the origin', () => {
    const xs = TILES.map((t) => t.x);
    const zs = TILES.map((t) => t.z);
    const half = LAYOUT.tileSize / 2;
    expect(Math.min(...xs) - half).toBeCloseTo(-TABLE_SIZE.width / 2);
    expect(Math.max(...xs) + half).toBeCloseTo(TABLE_SIZE.width / 2);
    expect(Math.min(...zs) - half).toBeCloseTo(-TABLE_SIZE.depth / 2);
    expect(Math.max(...zs) + half).toBeCloseTo(TABLE_SIZE.depth / 2);
  });

  it('spaces neighbouring tiles one pitch apart', () => {
    expect(tile(2).x - tile(1).x).toBeCloseTo(17 * PITCH);
    expect(tile(3).z - tile(1).z).toBeCloseTo(PITCH);
  });

  it('round-trips tile centres through world ↔ grid', () => {
    for (const t of TILES) {
      expect(worldToCol(t.x)).toBeCloseTo(t.col);
      expect(worldToRow(t.z)).toBeCloseTo(t.row);
    }
  });
});

describe('tileAtCell', () => {
  it('finds elements and reports empty or outside cells as null', () => {
    expect(tileAtCell(0, 0)).toBe(1);
    expect(tileAtCell(1, 0)).toBeNull();
    expect(tileAtCell(-1, 0)).toBeNull();
    expect(tileAtCell(0, ROWS)).toBeNull();
  });
});

describe('tileAtPoint', () => {
  const fe = tile(26);
  const edge = LAYOUT.tileSize / 2;

  it('finds the tile under every tile centre', () => {
    for (const t of TILES) expect(tileAtPoint(t.x, t.z)).toBe(t.number);
  });

  it('returns null over gaps, empty cells and outside the table', () => {
    expect(tileAtPoint(fe.x + edge + LAYOUT.gap / 2, fe.z)).toBeNull();
    expect(tileAtPoint(tile(1).x + PITCH, tile(1).z)).toBeNull();
    expect(tileAtPoint(0, -TABLE_SIZE.depth)).toBeNull();
  });

  it('is wider than the gap, so it holds a tile onto the edge of its neighbour', () => {
    expect(LAYOUT.hysteresis).toBeGreaterThan(LAYOUT.gap);
    const onCoEdge = fe.x + edge + LAYOUT.gap + 0.05;
    expect(tileAtPoint(onCoEdge, fe.z)).toBe(27);
    expect(tileAtPoint(onCoEdge, fe.z, 26)).toBe(26);
  });

  it('keeps the current tile over the gap, where a fresh lookup finds nothing', () => {
    const inGap = fe.x + edge + LAYOUT.gap / 2;
    expect(tileAtPoint(inGap, fe.z)).toBeNull();
    expect(tileAtPoint(inGap, fe.z, 26)).toBe(26);
  });

  it('lets go of the current tile beyond the hysteresis margin', () => {
    expect(tileAtPoint(fe.x + edge + LAYOUT.hysteresis + 0.01, fe.z, 26)).toBe(27);
    expect(tileAtPoint(fe.x, fe.z - edge - LAYOUT.hysteresis - 0.01, 26)).toBeNull();
    expect(tileAtPoint(tile(27).x, tile(27).z, 26)).toBe(27);
  });

  it('does not flicker when wobbling across a shared edge', () => {
    // Fe | Co boundary: the middle of the gap between them.
    const boundary = fe.x + PITCH / 2;
    const walk = (start: number, dxs: number[]) => {
      let current: number | null = start;
      return dxs.map((dx) => (current = tileAtPoint(boundary + dx, fe.z, current)));
    };
    expect(walk(26, [-0.05, 0.1, -0.08, 0.15, -0.01])).toEqual([26, 26, 26, 26, 26]);
    expect(walk(26, [0.1, 0.2, -0.1, 0.05, -0.15])).toEqual([26, 27, 27, 27, 27]);
  });
});
