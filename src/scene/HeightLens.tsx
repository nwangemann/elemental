import { useFrame } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { placeLift, stepActivationLift, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { lensFromHash, liftTargets, retargetLift } from '../core/lens.ts';
import { useAppStore } from '../state/store.ts';
import { ACTIVATION_FRAME_PRIORITY } from './TileActivator.tsx';

/** After the activation step (which clears `dirty`) and before tiles, labels and rings draw. */
export const LIFT_FRAME_PRIORITY = ACTIVATION_FRAME_PRIORITY + 0.25;
const MAX_DT = 0.1;

// A deep link's `?lens=` is the starting lens. Read once as the scene chunk loads, before
// anything renders, so the store never changes during a render.
const linked = lensFromHash(window.location.hash);
if (linked) useAppStore.getState().setLensHeight(linked);

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The height lens (`core/lens.ts`): writes each tile's lift into `activation.lift`, easing the
 * whole table over `CONFIG.tiles.lensDuration` when the store's `lens.height` changes (at once
 * with reduced motion). Tiles, labels, the tap marker and the figure's footing all read heights
 * through `tileTop`, so they follow. The lens on mount (a deep link's, say) starts in place.
 * Renders nothing.
 */
export function HeightLens({ activation }: { activation: Activation }) {
  const height = useAppStore((s) => s.lens.height);
  const [ease] = useState(() => placeLift(activation, liftTargets(ELEMENTS, height, CONFIG.tiles)));

  // On mount this retargets to where the tiles already are, which moves nothing.
  useEffect(() => {
    retargetLift(ease, activation.lift, liftTargets(ELEMENTS, height, CONFIG.tiles, ease.to));
  }, [activation, ease, height]);

  useFrame((_, delta) => {
    const duration = prefersReducedMotion() ? 0 : CONFIG.tiles.lensDuration;
    stepActivationLift(activation, ease, Math.min(delta, MAX_DT), duration);
  }, LIFT_FRAME_PRIORITY);

  return null;
}
