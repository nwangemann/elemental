import { Suspense, lazy, useEffect, useId, useState } from 'react';
import { LENS_KEYS, LENS_LABELS, cycleLens, isLensKey, type LensKey } from '../core/lens.ts';
import { isTextEntry } from '../scene/useKeyboardInput.ts';
import { useAppStore } from '../state/store.ts';
import { TemperatureControl } from './TemperatureControl.tsx';

// The legend reads the element data for its ends, so it shares the data chunk and loads only once
// a colour lens is on; the selects themselves need only the lens core.
const ColourLegend = lazy(() =>
  import('./ColourLegend.tsx').then((m) => ({ default: m.ColourLegend })),
);

/** The two lenses the control drives: which store field, key, and words each uses. */
const LENSES = [
  { which: 'height', code: 'KeyH', key: 'H', label: 'Height', off: 'Flat' },
  { which: 'colour', code: 'KeyG', key: 'G', label: 'Colour', off: 'Family' },
] as const;

type Which = (typeof LENSES)[number]['which'];

function setLens(which: Which, key: LensKey | null) {
  const store = useAppStore.getState();
  if (which === 'height') store.setLensHeight(key);
  else store.setLensColour(key);
}

/**
 * The lens controls in the HUD: a Height select that raises each tile by a property
 * (`scene/HeightLens.tsx`) and a Colour select that tints it (`scene/ColourLens.tsx`), with the
 * colour lens's legend under them, then the temperature lens (`TemperatureControl`,
 * `scene/TemperatureLens.tsx`). H and G (Shift backward) cycle each lens outside text fields, T
 * toggles the temperature; a key press is announced, since focus stays on the table.
 */
export function LensControl() {
  const id = useId();
  const lens = useAppStore((s) => s.lens);
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTextEntry(e.target)) return;
      const l = LENSES.find((x) => x.code === e.code);
      if (!l) return;
      e.preventDefault();
      const next = cycleLens(useAppStore.getState().lens[l.which], e.shiftKey ? -1 : 1);
      setLens(l.which, next);
      setAnnounce(`${l.label} lens${next === null ? ' off' : `: ${LENS_LABELS[next]}`}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section className="lens-control" aria-label="Lenses">
      {LENSES.map((l) => (
        <div key={l.which} className="lens-row">
          <label htmlFor={`${id}-${l.which}`}>
            {l.label} <kbd>{l.key}</kbd>
          </label>
          <select
            id={`${id}-${l.which}`}
            value={lens[l.which] ?? ''}
            aria-keyshortcuts={l.key}
            onChange={(e) => {
              const v = e.target.value;
              setLens(l.which, isLensKey(v) ? v : null);
            }}
          >
            <option value="">{l.off}</option>
            {LENS_KEYS.map((k) => (
              <option key={k} value={k}>
                {LENS_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      ))}
      {lens.colour && (
        <Suspense>
          <ColourLegend lensKey={lens.colour} />
        </Suspense>
      )}
      <TemperatureControl announce={setAnnounce} />
      <span className="visually-hidden" role="status">
        {announce}
      </span>
    </section>
  );
}
