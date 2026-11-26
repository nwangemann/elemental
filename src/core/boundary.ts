import type { Bounds } from './controller.ts';
import { LAYOUT, TABLE_SIZE, tileAtCell, TILES, worldToCol, worldToRow } from './layout.ts';

/**
 * What the character stands on (ADR 0009). Tiles are low platforms on an open ground: every
 * point that is not over a tile, inside the table's footprint or out past its edge, is ground.
 * The walkable area is the table plus a margin of ground all round (`outerBounds`).
 *
 * Narrow gaps between neighbouring tiles are bridged: a body counts as supported by a tile while
 * its centre is within `BOUNDARY.support` of the tile's square, which covers half a gap from each
 * side. So walking from tile to tile never drops into a gap, and only real empty space (the
 * d-block notch, the gap row above the f-block, the corners beside the f-block and the margin
 * outside) is ground.
 */

/** `surfaceAt`'s answer for the ground. Atomic numbers start at 1, so 0 is free. */
export const GROUND = 0;

export const BOUNDARY = {
  /**
   * How far past a tile's edge its top still supports the body's centre, world units. More than
   * half of `LAYOUT.gap`, so gaps between tiles are bridged; less than the body radius, so at an
   * outer edge the figure drops once about half of it hangs over.
   */
  support: 0.1,
  /**
   * Ground beyond the table's edge that the figure may walk on, world units (about one tile and a
   * bit, measured from the tile edge). Enough to step off and see the edge, close enough that
   * the way back is one hop.
   */
  margin: 1.5,
} as const;

const HALF_TILE = LAYOUT.tileSize / 2;

/**
 * Atomic number of the tile supporting a body centred at (x, z), or `GROUND`. Of two tiles
 * across a gap, the one the point overhangs least wins (the lower column or row on an exact tie).
 * O(1) and allocation-free: only the four grid cells around the point can be within reach.
 */
export function surfaceAt(x: number, z: number): number {
  const col = Math.floor(worldToCol(x));
  const row = Math.floor(worldToRow(z));
  let best = GROUND;
  let bestOverhang = Infinity;
  for (let dr = 0; dr < 2; dr++) {
    for (let dc = 0; dc < 2; dc++) {
      const number = tileAtCell(col + dc, row + dr);
      if (number === null) continue;
      const tile = TILES[number - 1]!;
      // Distance past the tile's square edge, measured per axis (0 or less = on the tile).
      const overhang = Math.max(Math.abs(x - tile.x), Math.abs(z - tile.z)) - HALF_TILE;
      if (overhang <= BOUNDARY.support && overhang < bestOverhang) {
        best = number;
        bestOverhang = overhang;
      }
    }
  }
  return best;
}

/**
 * Resting height of the surface under (x, z): the tile height over a tile, 0 on the ground. An
 * active tile's extra rise is not included; it belongs to the activation state.
 */
export function groundHeightAt(x: number, z: number, tileHeight: number): number {
  return surfaceAt(x, z) === GROUND ? 0 : tileHeight;
}

/**
 * Limits for the centre of a body of `radius`: the table's footprint grown by `margin` of ground
 * on every side.
 */
export function outerBounds(margin: number, radius: number): Bounds {
  const hx = Math.max(0, TABLE_SIZE.width / 2 + margin - radius);
  const hz = Math.max(0, TABLE_SIZE.depth / 2 + margin - radius);
  return { minX: -hx, maxX: hx, minZ: -hz, maxZ: hz };
}
