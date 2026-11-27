import { ELEMENTS } from '../core/elements/index.ts';
import { colourTargets, createTintEase, lensFromHash, type TintEase } from '../core/lens.ts';
import { useAppStore } from '../state/store.ts';

// A deep link's `?colour=` is the starting colour lens. Read once as the scene chunk loads,
// before anything renders, so the store never changes during a render.
const linked = lensFromHash(window.location.hash, 'colour');
if (linked) useAppStore.getState().setLensColour(linked);

/** The colour lens's ease, resting at the store's lens now, so the lens on mount starts in place. */
export function createSceneTint(): TintEase {
  return createTintEase(colourTargets(ELEMENTS, useAppStore.getState().lens.colour));
}
