import { useEffect } from 'react';
import type { ControllerState } from '../core/controller.ts';
import { TILES } from '../core/layout.ts';
import { setWalkTarget, type WalkTarget } from '../core/steering.ts';
import { nearestTile } from '../core/tileStep.ts';
import { useAppStore } from '../state/store.ts';

/**
 * Carries out return requests (R, Home or the "Back to the table" button): sets the walk target
 * to the last tile the character stood on, or the nearest tile if it has stood on none, as a walk that may climb cliffs. The
 * character walks back across the ground and hops up on arrival (`core/ledge.ts`). Works per
 * request, outside the frame loop. Renders nothing.
 */
export function ReturnHandler({
  controller,
  target,
}: {
  controller: ControllerState;
  target: WalkTarget;
}) {
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        if (s.returnSeq === prev.returnSeq) return;
        const number = s.lastTile ?? nearestTile(controller.x, controller.z);
        const tile = TILES[number - 1];
        if (tile) setWalkTarget(target, tile.x, tile.z, true);
      }),
    [controller, target],
  );
  return null;
}
