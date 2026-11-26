import { useEffect } from 'react';
import { teleport, type ControllerState } from '../core/controller.ts';
import { TILES } from '../core/layout.ts';
import { clearWalkTarget, type WalkTarget } from '../core/steering.ts';
import { useAppStore } from '../state/store.ts';

/**
 * Carries out fly-to requests from the explorer and deep links: the character is put on the
 * tile's centre at rest and any walk target is dropped. The camera's spring follow then glides
 * across the table to it, and the tile activates through the usual enter/leave path. Works per
 * request, outside the frame loop. Renders nothing.
 */
export function FlightHandler({
  controller,
  target,
}: {
  controller: ControllerState;
  target: WalkTarget;
}) {
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        if (!s.flight || s.flight === prev.flight) return;
        const tile = TILES[s.flight.number - 1];
        if (!tile) return;
        clearWalkTarget(target);
        teleport(controller, tile.x, tile.z);
      }),
    [controller, target],
  );
  return null;
}
