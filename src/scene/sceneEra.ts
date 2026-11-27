import { createEraEase, yearFromHash, type EraEase } from '../core/discovery.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { useAppStore } from '../state/store.ts';

// A deep link's `?year=` is the starting year. Read once as the scene chunk loads, before
// anything renders, so the store never changes during a render.
const linked = yearFromHash(window.location.hash);
if (linked !== null) useAppStore.getState().setLensYear(linked);

/** The discovery lens's ease, resting at the store's year now, so it starts in place. */
export function createSceneEra(): EraEase {
  return createEraEase(ELEMENTS, useAppStore.getState().lens.year);
}
