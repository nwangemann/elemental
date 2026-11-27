import { useEffect } from 'react';
import type { ControllerState } from '../core/controller.ts';
import { tileAtPoint, TILES } from '../core/layout.ts';
import { setWalkTarget, type WalkTarget } from '../core/steering.ts';
import {
  nearestTile,
  numberStepForKey,
  stepDirectionForCode,
  stepNumber,
  stepTile,
} from '../core/tileStep.ts';
import { useAppStore } from '../state/store.ts';
import { isTextEntry } from './useKeyboardInput.ts';

/**
 * I, J, K and L step from tile to tile (`core/tileStep.ts`); `[` and `]` step to the previous or
 * next element by atomic number. Each press sets the walk target to the next tile, so the character walks there and stops on its centre; presses
 * during the walk chain on from the tile it is heading for. Works per key press, outside the frame
 * loop. Renders nothing.
 */
export function TileStepper({
  controller,
  target,
}: {
  controller: ControllerState;
  target: WalkTarget;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTextEntry(e.target)) return;
      const dir = stepDirectionForCode(e.code);
      const delta = numberStepForKey(e.key);
      if (!dir && !delta) return;
      e.preventDefault();
      const from =
        (target.active ? tileAtPoint(target.x, target.z) : null) ??
        useAppStore.getState().activeTile?.number ??
        nearestTile(controller.x, controller.z);
      const next = dir ? stepTile(from, dir) : stepNumber(from, delta);
      const tile = next === null ? TILES[from - 1] : TILES[next - 1];
      if (tile) setWalkTarget(target, tile.x, tile.z);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller, target]);
  return null;
}
