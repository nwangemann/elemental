import { useFrame } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { stepActivationPhase, type Activation } from '../core/activation.ts';
import { CONFIG } from '../core/config.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { retargetPhase, stepPhase, type PhaseEase } from '../core/temperature.ts';
import { useAppStore } from '../state/store.ts';
import { LIFT_FRAME_PRIORITY } from './HeightLens.tsx';

const MAX_DT = 0.1;

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The temperature lens (`core/temperature.ts`, ADR 0018): when the store's `lens.temperature`
 * changes, retargets `phase`; each frame steps it, one change of state per
 * `CONFIG.tiles.phaseDuration` (at once with reduced motion), and writes gas tiles' float into
 * `activation.phaseLift`, so labels, footing and the tap marker follow through `tileTop`. `Tiles`
 * draws the phase; `FramePacer` keeps frames coming while it moves. Renders nothing.
 */
export function TemperatureLens({
  activation,
  phase,
}: {
  activation: Activation;
  phase: PhaseEase;
}) {
  // The lens on mount (a deep link's, say) is placed at once, before tiles first draw.
  useState(() => stepActivationPhase(activation, phase, CONFIG.tiles.gasLift, true));

  useEffect(() => {
    // Catches a temperature set between the ease's creation and this subscription.
    retargetPhase(phase, ELEMENTS, useAppStore.getState().lens.temperature);
    return useAppStore.subscribe((s, prev) => {
      if (s.lens.temperature !== prev.lens.temperature)
        retargetPhase(phase, ELEMENTS, s.lens.temperature);
    });
  }, [phase]);

  useFrame((_, delta) => {
    const duration = prefersReducedMotion() ? 0 : CONFIG.tiles.phaseDuration;
    stepPhase(phase, Math.min(delta, MAX_DT), duration);
    stepActivationPhase(activation, phase, CONFIG.tiles.gasLift);
  }, LIFT_FRAME_PRIORITY);

  return null;
}
