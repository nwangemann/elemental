import { positionOf } from './elements/position.ts';

/**
 * Where every element's tile sits in the world.
 *
 * Grid: `col` 0–17 is group 1–18; `row` 0–6 is period 1–7. The two f-block rows sit below the
 * main table after one empty row (rows 8 and 9), under groups 3–16.
 *
 * World: the ground is the x–z plane, y up. Columns run along +x and rows along +z, and the whole
 * table is centred on the origin. Tiles are squares of `tileSize` with `gap` between them.
 */
export const LAYOUT = {
  tileSize: 1,
  gap: 0.15,
  /** Empty rows between the main table and the f-block. */
  fBlockGapRows: 1,
  /** Column of the first f-block element (La, Ac): under group 3. */
  fBlockFirstCol: 2,
  /**
   * How far, in world units, the character may stray off its tile before it counts as leaving.
   * Larger than `gap`, so a neighbour is only entered once the character is well onto it.
   */
  hysteresis: 0.25,
} as const;

export const COLS = 18;
const MAIN_ROWS = 7;
export const ROWS = MAIN_ROWS + LAYOUT.fBlockGapRows + 2;
export const PITCH = LAYOUT.tileSize + LAYOUT.gap;

/** Width (x) and depth (z) of the table's footprint, edge to edge. */
export const TABLE_SIZE = {
  width: COLS * PITCH - LAYOUT.gap,
  depth: ROWS * PITCH - LAYOUT.gap,
} as const;

/** World position of the centre of column 0, row 0. */
const ORIGIN_X = -TABLE_SIZE.width / 2 + LAYOUT.tileSize / 2;
const ORIGIN_Z = -TABLE_SIZE.depth / 2 + LAYOUT.tileSize / 2;

export interface Tile {
  /** Atomic number. */
  number: number;
  col: number;
  row: number;
  /** Centre in world units. */
  x: number;
  z: number;
}

/** Grid cell of an element. */
export function cellOf(z: number): { col: number; row: number } {
  const { period, group } = positionOf(z);
  if (group !== null) return { col: group - 1, row: period - 1 };
  const first = period === 6 ? 57 : 89;
  return {
    col: LAYOUT.fBlockFirstCol + (z - first),
    row: MAIN_ROWS + LAYOUT.fBlockGapRows + (period - 6),
  };
}

export function cellCenterX(col: number): number {
  return ORIGIN_X + col * PITCH;
}

export function cellCenterZ(row: number): number {
  return ORIGIN_Z + row * PITCH;
}

/** All 118 tiles, index = atomic number − 1. */
export const TILES: readonly Tile[] = Array.from({ length: 118 }, (_, i) => {
  const number = i + 1;
  const { col, row } = cellOf(number);
  return { number, col, row, x: cellCenterX(col), z: cellCenterZ(row) };
});

/** Atomic number per grid cell (`row * COLS + col`), 0 where there is no tile. */
const GRID = new Uint8Array(COLS * ROWS);
for (const tile of TILES) GRID[tile.row * COLS + tile.col] = tile.number;

/** Fractional column under world x; whole numbers are tile centres. */
export function worldToCol(x: number): number {
  return (x - ORIGIN_X) / PITCH;
}

/** Fractional row under world z; whole numbers are tile centres. */
export function worldToRow(z: number): number {
  return (z - ORIGIN_Z) / PITCH;
}

/** Element whose tile occupies grid cell (col, row), or null. */
export function tileAtCell(col: number, row: number): number | null {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return GRID[row * COLS + col] || null;
}

/** True when (x, z) is within `margin` of the tile's square (margin 0 = the tile itself). */
function onTile(tile: Tile, x: number, z: number, margin: number): boolean {
  const half = LAYOUT.tileSize / 2 + margin;
  return Math.abs(x - tile.x) <= half && Math.abs(z - tile.z) <= half;
}

/**
 * The element whose tile is under world point (x, z), or null over a gap or empty cell.
 * O(1) and allocation-free, so it is safe to call every frame.
 *
 * Pass the current tile to get hysteresis: the character keeps that tile until it is more than
 * `LAYOUT.hysteresis` beyond its edge, so walking along a boundary does not flicker. A new tile
 * is only entered when the point is properly on it.
 */
export function tileAtPoint(x: number, z: number, current: number | null = null): number | null {
  if (current !== null) {
    const tile = TILES[current - 1];
    if (tile && onTile(tile, x, z, LAYOUT.hysteresis)) return current;
  }
  const number = tileAtCell(Math.round(worldToCol(x)), Math.round(worldToRow(z)));
  if (number === null) return null;
  return onTile(TILES[number - 1]!, x, z, 0) ? number : null;
}
