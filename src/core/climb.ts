import { GROUND, surfaceAt } from './boundary.ts';
import type { ControllerState } from './controller.ts';
import { LAYOUT, TILES } from './layout.ts';

/**
 * Walking over a landscape of tiles at different heights (ADR 0014). A step up no taller than
 * `climbLimit` is climbed (`core/ledge.ts` hops it); a taller one is a cliff that blocks walking
 * like a wall, so the figure never ends up inside or on top of a column it could not climb.
 * Steps down are never blocked: the figure walks off and falls. Pure and allocation-free.
 */

/** Height of the top of `support` (a tile number or `GROUND`), as the scene draws it now. */
export type SurfaceHeight = (support: number) => number;

/**
 * True when the surface under (x, z) rises more than `limit` above `reference` (the height the
 * feet are at or heading for).
 */
export function isCliff(
  x: number,
  z: number,
  reference: number,
  limit: number,
  heightOf: SurfaceHeight,
): boolean {
  const support = surfaceAt(x, z);
  return support !== GROUND && heightOf(support) - reference > limit;
}

/**
 * Undoes the part of the move from (`fromX`, `fromZ`) to the controller's position that walks
 * into a cliff, one axis at a time, so the figure slides along a cliff face instead of sticking
 * to it. Each axis probes `probe` ahead of the body's centre in the direction it moved (the body
 * radius less the tiles' support overhang puts the stop at about the cliff's face). The blocked
 * axis keeps its old position and loses its velocity. Returns true when any axis was blocked.
 */
export function blockCliffs(
  s: ControllerState,
  fromX: number,
  fromZ: number,
  reference: number,
  limit: number,
  probe: number,
  heightOf: SurfaceHeight,
): boolean {
  let blocked = false;
  const dx = s.x - fromX;
  if (dx !== 0 && isCliff(s.x + Math.sign(dx) * probe, fromZ, reference, limit, heightOf)) {
    s.x = fromX;
    s.vx = 0;
    blocked = true;
  }
  const dz = s.z - fromZ;
  if (dz !== 0 && isCliff(s.x, s.z + Math.sign(dz) * probe, reference, limit, heightOf)) {
    s.z = fromZ;
    s.vz = 0;
    blocked = true;
  }
  return blocked;
}

/** A point on the table that a ray hit. */
export interface SurfaceHit {
  x: number;
  y: number;
  z: number;
}

const HALF_TILE = LAYOUT.tileSize / 2;

/**
 * Where a ray from (ox, oy, oz) along (dx, dy, dz) first meets the table: the nearest tile box
 * (its square footprint, from the ground up to `heightOf`) it enters, or else the ground plane.
 * So a tap on a raised tile's top or side picks that tile, and one past it picks what is behind.
 * Writes into `out` and returns true, or false when the ray never comes down to the ground.
 * Loops over the 118 tiles; meant for a tap, not for every frame.
 */
export function pickSurface(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  heightOf: SurfaceHeight,
  out: SurfaceHit,
): boolean {
  let best = dy < 0 ? -oy / dy : Infinity;
  for (const tile of TILES) {
    const t = rayBox(ox, oy, oz, dx, dy, dz, tile.x, tile.z, heightOf(tile.number));
    if (t < best) best = t;
  }
  if (!Number.isFinite(best)) return false;
  out.x = ox + dx * best;
  out.y = oy + dy * best;
  out.z = oz + dz * best;
  return true;
}

/** Entry distance of the ray into a tile's box (slab method), or Infinity when it misses. */
function rayBox(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cz: number,
  top: number,
): number {
  const range = { near: 0, far: Infinity };
  if (!slab(ox, dx, cx - HALF_TILE, cx + HALF_TILE, range)) return Infinity;
  if (!slab(oy, dy, 0, top, range)) return Infinity;
  if (!slab(oz, dz, cz - HALF_TILE, cz + HALF_TILE, range)) return Infinity;
  return range.near;
}

/** Narrows `range` to where the ray is between `lo` and `hi` on one axis; false once it is empty. */
function slab(
  o: number,
  d: number,
  lo: number,
  hi: number,
  range: { near: number; far: number },
): boolean {
  if (d === 0) return o >= lo && o <= hi;
  const a = (lo - o) / d;
  const b = (hi - o) / d;
  range.near = Math.max(range.near, Math.min(a, b));
  range.far = Math.min(range.far, Math.max(a, b));
  return range.near <= range.far;
}
