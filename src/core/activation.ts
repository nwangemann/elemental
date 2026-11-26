import { GROUND } from './boundary.ts';
import { CONFIG } from './config.ts';
import { tileAtPoint, TILES } from './layout.ts';

/**
 * Which tile the character stands on, and how far each tile is through its enter/leave
 * animation. `levels[i]` is the activation of element i + 1: 0 at rest, 1 fully active. The
 * current tile ramps toward 1 and every other tile toward 0, linearly over `duration` seconds;
 * renderers shape it with `easeLevel`.
 *
 * `dirty[i]` is 1 when tile i's level changed in the last step, so renderers only rewrite the
 * tiles that moved, and `anyDirty` lets them skip the frame entirely.
 */
export interface Activation {
  current: number | null;
  levels: Float32Array;
  dirty: Uint8Array;
  anyDirty: boolean;
}

export function createActivation(): Activation {
  return {
    current: null,
    levels: new Float32Array(TILES.length),
    dirty: new Uint8Array(TILES.length),
    anyDirty: false,
  };
}

/**
 * Advances the activation for a character at world (x, z). The current tile comes from
 * `tileAtPoint` with hysteresis, so walking along an edge does not flicker. Allocation-free.
 *
 * Pass `standingOn` (from `core/ledge.ts`) so a tile only wakes once the figure is on top of it
 * (ADR 0009): `GROUND` (0) means on the ground, falling or hopping, and no tile is current. On a
 * tile top, the point decides as above, falling back to the supporting tile when the point is
 * just past its edge. Leave it out to go by the point alone.
 *
 * @returns true when the current tile changed (entered, left, or moved to a neighbour).
 */
export function stepActivation(
  a: Activation,
  x: number,
  z: number,
  dt: number,
  duration: number,
  standingOn?: number,
): boolean {
  const next =
    standingOn === undefined
      ? tileAtPoint(x, z, a.current)
      : standingOn === GROUND
        ? null
        : (tileAtPoint(x, z, a.current) ?? standingOn);
  const changed = next !== a.current;
  a.current = next;

  const step = duration > 0 ? dt / duration : 1;
  a.anyDirty = false;
  for (let i = 0; i < a.levels.length; i++) {
    const level = a.levels[i]!;
    const target = next === i + 1 ? 1 : 0;
    if (level === target) {
      a.dirty[i] = 0;
      continue;
    }
    a.levels[i] = target > level ? Math.min(1, level + step) : Math.max(0, level - step);
    a.dirty[i] = 1;
    a.anyDirty = true;
  }
  return changed;
}

/** Smoothstep easing of a 0–1 activation level, so tiles start and settle gently. */
export function easeLevel(level: number): number {
  return level * level * (3 - 2 * level);
}

/** Height of tile i's top above the ground: the resting height plus its eased rise. */
export function tileTop(a: Activation, i: number): number {
  return CONFIG.tiles.height + CONFIG.tiles.rise * easeLevel(a.levels[i]!);
}
