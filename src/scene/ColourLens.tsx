import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { colourTargets, retargetTint, stepTint, type TintEase } from '../core/lens.ts';
import { useAppStore } from '../state/store.ts';
import { LIFT_FRAME_PRIORITY } from './HeightLens.tsx';

const MAX_DT = 0.1;

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The colour lens (`core/lens.ts`): when the store's `lens.colour` changes, retargets `tint` to
 * the new colours, and each frame steps it over `CONFIG.tiles.tintDuration` (at once with
 * reduced motion). `Tiles` draws from it; `FramePacer` keeps frames coming while it moves.
 * Renders nothing.
 */
export function ColourLens({ tint }: { tint: TintEase }) {
  useEffect(() => {
    const targets = new Float32Array(tint.to.length);
    return useAppStore.subscribe((s, prev) => {
      if (s.lens.colour === prev.lens.colour) return;
      retargetTint(tint, colourTargets(ELEMENTS, s.lens.colour, targets));
    });
  }, [tint]);

  useFrame((_, delta) => {
    const duration = prefersReducedMotion() ? 0 : CONFIG.tiles.tintDuration;
    stepTint(tint, Math.min(delta, MAX_DT), duration);
  }, LIFT_FRAME_PRIORITY);

  return null;
}
