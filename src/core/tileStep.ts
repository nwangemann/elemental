import { COLS, ROWS, tileAtCell, TILES, worldToCol, worldToRow } from './layout.ts';

/**
 * Keyboard stepping from tile to tile, as pure grid maths. One press moves to the next tile in a
 * screen direction, skipping gaps and empty cells, so the whole table can be toured with the
 * keyboard alone and every press lands squarely on an element.
 */

export type StepDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Step keys by `KeyboardEvent.code`: I, J, K and L, laid out like the arrows. They sit beside the
 * WASD walking keys without overlapping them, and work on any layout because they go by code.
 */
export const STEP_KEYS: Readonly<Record<string, StepDirection>> = {
  KeyI: 'up',
  KeyK: 'down',
  KeyJ: 'left',
  KeyL: 'right',
};

/** Step direction for a key code, or null. */
export function stepDirectionForCode(code: string): StepDirection | null {
  return STEP_KEYS[code] ?? null;
}

/**
 * Return keys by `KeyboardEvent.code`: R (any layout, by position) and Home. Either walks the
 * character back to the last tile it stood on, which is how a player who wandered onto the ground
 * gets back to the table.
 */
export const RETURN_KEYS: ReadonlySet<string> = new Set(['KeyR', 'Home']);

/** True for a key code that returns the character to the table. */
export function isReturnCode(code: string): boolean {
  return RETURN_KEYS.has(code);
}

/**
 * The tile nearest to world point (x, z): the one whose centre is closest. Used when the
 * character stands between tiles or off the table, so a step still has somewhere to start.
 */
export function nearestTile(x: number, z: number): number {
  const col = worldToCol(x);
  const row = worldToRow(z);
  let best = 1;
  let bestD = Infinity;
  for (const t of TILES) {
    const d = (t.col - col) ** 2 + (t.row - row) ** 2;
    if (d < bestD) {
      bestD = d;
      best = t.number;
    }
  }
  return best;
}

/**
 * The tile one step from element `from` in `dir`, or null at the edge of the table.
 *
 * Left and right stay in the row and skip empty cells (H → He). Up and down take the next row in
 * that direction that has a tile in the same column, skipping the gap rows (group 3 goes from
 * period 7 to the f-block). When no row further on has a tile in that column, they go to
 * the nearest tile in the next row that has any (Fr → La), so down always reaches the f-block.
 */
export function stepTile(from: number, dir: StepDirection): number | null {
  const tile = TILES[from - 1];
  if (!tile) return null;
  const { col, row } = tile;

  if (dir === 'left' || dir === 'right') {
    const d = dir === 'right' ? 1 : -1;
    for (let c = col + d; c >= 0 && c < COLS; c += d) {
      const n = tileAtCell(c, row);
      if (n !== null) return n;
    }
    return null;
  }

  const d = dir === 'down' ? 1 : -1;
  let firstRowWithTiles = -1;
  for (let r = row + d; r >= 0 && r < ROWS; r += d) {
    const n = tileAtCell(col, r);
    if (n !== null) return n;
    if (firstRowWithTiles < 0 && rowHasTiles(r)) firstRowWithTiles = r;
  }
  if (firstRowWithTiles < 0) return null;
  return nearestInRow(firstRowWithTiles, col);
}

function rowHasTiles(row: number): boolean {
  for (let c = 0; c < COLS; c++) if (tileAtCell(c, row) !== null) return true;
  return false;
}

/** The tile in `row` whose column is closest to `col`; ties go left. */
function nearestInRow(row: number, col: number): number | null {
  for (let off = 0; off < COLS; off++) {
    const left = tileAtCell(col - off, row);
    if (left !== null) return left;
    const right = tileAtCell(col + off, row);
    if (right !== null) return right;
  }
  return null;
}
