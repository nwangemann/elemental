import { ELEMENTS } from '../core/elements/index.ts';
import { createPhaseEase, temperatureFromHash, type PhaseEase } from '../core/temperature.ts';
import { useAppStore } from '../state/store.ts';

// A deep link's `?t=` is the starting temperature. Read once as the scene chunk loads, before
// anything renders, so the store never changes during a render.
const linked = temperatureFromHash(window.location.hash);
if (linked !== null) useAppStore.getState().setLensTemperature(linked);

/** The temperature lens's ease, resting at the store's temperature now, so it starts in place. */
export function createScenePhase(): PhaseEase {
  return createPhaseEase(ELEMENTS, useAppStore.getState().lens.temperature);
}
