import { useFrame } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { stepActivationEra, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { retargetEra, stepEra, type EraEase } from '../core/discovery.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { useAppStore } from '../state/store.ts';
import { LIFT_FRAME_PRIORITY } from './HeightLens.tsx';

const MAX_DT = 0.1;

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The discovery lens (`core/discovery.ts`, ADR 0019): when the store's `lens.year` changes,
 * retargets `era`; each frame steps it over `CONFIG.tiles.eraDuration` (at once with reduced
 * motion, which also drops the settle) and writes each undiscovered tile's sink into
 * `activation.eraSink`, so labels, footing and the tap marker follow through `tileTop`. `Tiles`
 * draws the grey; `FramePacer` keeps frames coming while it moves. Renders nothing.
 */
export function DiscoveryLens({ activation, era }: { activation: Activation; era: EraEase }) {
  // The lens on mount (a deep link's, say) is placed at once, before tiles first draw.
  useState(() =>
    stepActivationEra(activation, era, CONFIG.tiles.eraDepth, CONFIG.tiles.eraSettle, true),
  );

  useEffect(() => {
    // Catches a year set between the ease's creation and this subscription.
    retargetEra(era, ELEMENTS, useAppStore.getState().lens.year);
    return useAppStore.subscribe((s, prev) => {
      if (s.lens.year !== prev.lens.year) retargetEra(era, ELEMENTS, s.lens.year);
    });
  }, [era]);

  useFrame((_, delta) => {
    const reduced = prefersReducedMotion();
    stepEra(era, Math.min(delta, MAX_DT), reduced ? 0 : CONFIG.tiles.eraDuration);
    stepActivationEra(activation, era, CONFIG.tiles.eraDepth, reduced ? 0 : CONFIG.tiles.eraSettle);
  }, LIFT_FRAME_PRIORITY);

  return null;
}
