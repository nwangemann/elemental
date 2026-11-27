import { useFrame } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { placeLift, stepActivationLift, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { contextLevels } from '../core/compounds/contexts.ts';
import type { Context } from '../core/compounds/source.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import {
  lensFromHash,
  liftFromLevels,
  liftTargets,
  retargetLift,
  type LensKey,
} from '../core/lens.ts';
import { useAppStore } from '../state/store.ts';
import { ACTIVATION_FRAME_PRIORITY } from './TileActivator.tsx';

/** After the activation step (which clears `dirty`) and before tiles, labels and rings draw. */
export const LIFT_FRAME_PRIORITY = ACTIVATION_FRAME_PRIORITY + 0.25;
const MAX_DT = 0.1;

// A deep link's `?lens=` is the starting lens. Read once as the scene chunk loads, before
// anything renders, so the store never changes during a render.
const linked = lensFromHash(window.location.hash);
if (linked) useAppStore.getState().setLensHeight(linked);

const SYMBOLS = ELEMENTS.map((e) => e.symbol);

/**
 * The lifts to ease to: by share for a Combine context that has shares (body, air, earth),
 * else by the height lens's property.
 */
function targets(height: LensKey | null, context: Context | null, out?: Float32Array) {
  const levels = context && contextLevels(context, SYMBOLS, out);
  return levels
    ? liftFromLevels(levels, CONFIG.tiles, levels)
    : liftTargets(ELEMENTS, height, CONFIG.tiles, out);
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The height lens (`core/lens.ts`): writes each tile's lift into `activation.lift`, easing the
 * whole table over `CONFIG.tiles.lensDuration` when the store's `lens.height` changes (at once
 * with reduced motion). Tiles, labels, the tap marker and the figure's footing all read heights
 * through `tileTop`, so they follow. The lens on mount (a deep link's, say) starts in place.
 * While Combine is open with a context picked, the context's shares set the heights instead.
 * Renders nothing.
 */
export function HeightLens({ activation }: { activation: Activation }) {
  const height = useAppStore((s) => s.lens.height);
  const context = useAppStore((s) => (s.combine.open ? s.combine.context : null));
  const [ease] = useState(() => placeLift(activation, targets(height, context)));

  // On mount this retargets to where the tiles already are, which moves nothing.
  useEffect(() => {
    retargetLift(ease, activation.lift, targets(height, context, ease.to));
  }, [activation, ease, height, context]);

  useFrame((_, delta) => {
    const duration = prefersReducedMotion() ? 0 : CONFIG.tiles.lensDuration;
    stepActivationLift(activation, ease, Math.min(delta, MAX_DT), duration);
  }, LIFT_FRAME_PRIORITY);

  return null;
}
