import { describe, expect, it } from 'vitest';
import { BOUNDARY, GROUND, groundHeightAt, outerBounds, surfaceAt } from './boundary.ts';
import { tableBounds } from './controller.ts';
import { cellCenterX, cellCenterZ, LAYOUT, PITCH, TABLE_SIZE, TILES } from './layout.ts';

const HALF = LAYOUT.tileSize / 2;
const tile = (n: number) => TILES[n - 1]!;

describe('surfaceAt', () => {
  it('finds every tile at its centre and corners', () => {
    for (const t of TILES) {
      expect(surfaceAt(t.x, t.z)).toBe(t.number);
      expect(surfaceAt(t.x - HALF + 0.01, t.z + HALF - 0.01)).toBe(t.number);
    }
  });

  it('bridges the gap between neighbouring tiles', () => {
    const li = tile(3);
    const be = tile(4);
    const mid = (li.x + be.x) / 2;
    expect(surfaceAt(mid, li.z)).not.toBe(GROUND);
    expect(surfaceAt(li.x + HALF + 0.05, li.z)).toBe(3);
    expect(surfaceAt(be.x - HALF - 0.05, be.z)).toBe(4);
    // Where four tiles meet (Na, Mg, K, Ca), the corner gap is bridged too.
    const na = tile(11);
    expect(surfaceAt(na.x + PITCH / 2, na.z + PITCH / 2)).not.toBe(GROUND);
  });

  it('is ground in the empty areas', () => {
    // The d-block notch above Sc–Zn, between H and He.
    expect(surfaceAt(cellCenterX(8), cellCenterZ(0))).toBe(GROUND);
    expect(surfaceAt(cellCenterX(5), cellCenterZ(2))).toBe(GROUND);
    // The gap row between the main table and the f-block.
    expect(surfaceAt(cellCenterX(0), cellCenterZ(7))).toBe(GROUND);
    expect(surfaceAt(cellCenterX(10), cellCenterZ(7))).toBe(GROUND);
    // The corners beside the f-block.
    expect(surfaceAt(cellCenterX(0), cellCenterZ(9))).toBe(GROUND);
    expect(surfaceAt(cellCenterX(17), cellCenterZ(8))).toBe(GROUND);
    // Outside the table.
    expect(surfaceAt(0, -TABLE_SIZE.depth)).toBe(GROUND);
    expect(surfaceAt(TABLE_SIZE.width, 0)).toBe(GROUND);
  });

  it('supports the body until it overhangs an outer edge by more than the support margin', () => {
    const h = tile(1);
    const inside = HALF + BOUNDARY.support - 0.01;
    const outside = HALF + BOUNDARY.support + 0.01;
    expect(surfaceAt(h.x, h.z - inside)).toBe(1); // top edge
    expect(surfaceAt(h.x, h.z - outside)).toBe(GROUND);
    expect(surfaceAt(h.x + inside, h.z)).toBe(1); // into the notch
    expect(surfaceAt(h.x + outside, h.z)).toBe(GROUND);
    const ra = tile(88);
    expect(surfaceAt(ra.x, ra.z + inside)).toBe(88); // over the gap row
    expect(surfaceAt(ra.x, ra.z + outside)).toBe(GROUND);
  });

  it('keeps the support margin within the geometry it relies on', () => {
    expect(BOUNDARY.support).toBeGreaterThan(LAYOUT.gap / 2);
    expect(BOUNDARY.support).toBeLessThan(PITCH / 2);
  });
});

describe('groundHeightAt', () => {
  it('is the tile height over a tile and 0 on the ground', () => {
    const fe = tile(26);
    expect(groundHeightAt(fe.x, fe.z, 0.18)).toBe(0.18);
    expect(groundHeightAt(cellCenterX(8), cellCenterZ(0), 0.18)).toBe(0);
  });
});

describe('outerBounds', () => {
  it('grows the table by the margin, less the body radius', () => {
    const b = outerBounds(BOUNDARY.margin, 0.2);
    expect(b.maxX).toBeCloseTo(TABLE_SIZE.width / 2 + BOUNDARY.margin - 0.2);
    expect(b.minZ).toBeCloseTo(-(TABLE_SIZE.depth / 2 + BOUNDARY.margin - 0.2));
    const table = tableBounds(TABLE_SIZE.width, TABLE_SIZE.depth, 0.2);
    expect(b.maxX).toBeGreaterThan(table.maxX);
    expect(b.maxZ).toBeGreaterThan(table.maxZ);
  });

  it('leaves ground to stand on past every outer edge', () => {
    const b = outerBounds(BOUNDARY.margin, 0.2);
    expect(surfaceAt(b.maxX, 0)).toBe(GROUND);
    expect(surfaceAt(0, b.minZ)).toBe(GROUND);
  });

  it('never inverts for a huge radius', () => {
    const b = outerBounds(0, 1000);
    expect(b.minX).toBe(-0);
    expect(b.maxX).toBe(0);
  });
});
