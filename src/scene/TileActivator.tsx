import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import { stepActivation, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import type { ControllerState } from '../core/controller.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { GROUND } from '../core/boundary.ts';
import { standingOn, type LedgeState } from '../core/ledge.ts';
import { useAppStore } from '../state/store.ts';
import { CHARACTER_FRAME_PRIORITY } from './Character.tsx';

/** Runs after the character has moved this frame and before the tiles, labels and rings draw. */
export const ACTIVATION_FRAME_PRIORITY = CHARACTER_FRAME_PRIORITY + 0.5;
const MAX_DT = 0.1;

function publish(number: number | null): void {
  const element = number === null ? undefined : ELEMENTS[number - 1];
  useAppStore
    .getState()
    .setActiveTile(element ? { number: element.number, name: element.name } : null);
}

/**
 * Steps `core/activation.ts` with the character's position every frame and writes the store
 * only when the tile under the character changes. A tile only wakes once the character stands on
 * top of it (`core/ledge.ts`), not while it hops up or after it drops to the ground. Also writes
 * `offTable` (on the ground, ADR 0009) when it changes. Renders nothing.
 */
export function TileActivator({
  activation,
  controller,
  ledge,
}: {
  activation: Activation;
  controller: ControllerState;
  ledge: LedgeState;
}) {
  // Clear the store when the scene goes away, so the interface does not show a stale tile.
  useEffect(
    () => () => {
      publish(null);
      useAppStore.getState().setOffTable(false);
    },
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, MAX_DT);
    const on = standingOn(ledge);
    const changed = stepActivation(
      activation,
      controller.x,
      controller.z,
      dt,
      CONFIG.tiles.activateDuration,
      on,
    );
    if (changed) publish(activation.current);
    const off = on === GROUND;
    const store = useAppStore.getState();
    if (off !== store.offTable) store.setOffTable(off);
  }, ACTIVATION_FRAME_PRIORITY);

  return null;
}
