import { useEffect, useId, useState } from 'react';
import { LENS_KEYS, LENS_LABELS, cycleLens, isLensKey } from '../core/lens.ts';
import { isTextEntry } from '../scene/useKeyboardInput.ts';
import { useAppStore } from '../state/store.ts';

/**
 * The height lens control: a select in the HUD that raises each tile by a property (the scene
 * eases them, `scene/HeightLens.tsx`), and the H key (Shift H backward) that cycles through the
 * lenses outside text fields. A key press is announced, since focus stays on the table.
 */
export function LensControl() {
  const id = useId();
  const height = useAppStore((s) => s.lens.height);
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyH' || e.metaKey || e.ctrlKey || e.altKey || isTextEntry(e.target)) return;
      e.preventDefault();
      const store = useAppStore.getState();
      const next = cycleLens(store.lens.height, e.shiftKey ? -1 : 1);
      store.setLensHeight(next);
      setAnnounce(next === null ? 'Height lens off' : `Height lens: ${LENS_LABELS[next]}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section className="lens-control" aria-label="Height lens">
      <label htmlFor={id}>
        Lens <kbd>H</kbd>
      </label>
      <select
        id={id}
        value={height ?? ''}
        aria-keyshortcuts="H"
        onChange={(e) => {
          const v = e.target.value;
          useAppStore.getState().setLensHeight(isLensKey(v) ? v : null);
        }}
      >
        <option value="">Flat</option>
        {LENS_KEYS.map((k) => (
          <option key={k} value={k}>
            {LENS_LABELS[k]}
          </option>
        ))}
      </select>
      <span className="visually-hidden" role="status">
        {announce}
      </span>
    </section>
  );
}
