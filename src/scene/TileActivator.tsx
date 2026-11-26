import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import { stepActivation, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import type { ControllerState } from '../core/controller.ts';
import { ELEMENTS } from '../core/elements/index.ts';
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
 * only when the tile under the character changes. Renders nothing.
 */
export function TileActivator({
  activation,
  controller,
}: {
  activation: Activation;
  controller: ControllerState;
}) {
  // Clear the store when the scene goes away, so the interface does not show a stale tile.
  useEffect(() => () => publish(null), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, MAX_DT);
    const changed = stepActivation(
      activation,
      controller.x,
      controller.z,
      dt,
      CONFIG.tiles.activateDuration,
    );
    if (changed) publish(activation.current);
  }, ACTIVATION_FRAME_PRIORITY);

  return null;
}
