import { Suspense, lazy, useEffect, useId, useRef, type CSSProperties } from 'react';
import { formatTemperature } from '../core/elementFacts.ts';
import { DETENTS, detentAt, positionOf, sliderKelvin } from '../core/temperature.ts';
import { isTextEntry } from '../scene/useKeyboardInput.ts';
import { useAppStore } from '../state/store.ts';

// The counts read the element data, so they share the data chunk and load once the lens is on.
const TemperatureSummary = lazy(() =>
  import('./TemperatureSummary.tsx').then((m) => ({ default: m.TemperatureSummary })),
);

/** The temperature the lens turns on at when no earlier one is remembered. */
const ROOM = DETENTS[0]!.kelvin;
/** Slider steps across the whole track; the scale (`kelvinAt`) is non-linear. */
const STEPS = 1000;
/** Keys that move a range input. */
const STEP_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

/** The value as the slider reads it out: "310.15 K (37 °C), body temperature". */
function valueText(kelvin: number): string {
  const d = detentAt(kelvin);
  return `${formatTemperature(kelvin)}${d ? `, ${d.label.toLowerCase()}` : ''}`;
}

function set(k: number | null) {
  useAppStore.getState().setLensTemperature(k);
}

/**
 * The temperature lens's row in the lens control: a toggle, and while the lens is on a range slider
 * over the non-linear scale (`positionOf`, snapping to the detents through `sliderKelvin`), the
 * value in kelvin and Celsius, tick marks and buttons for the detents, and the counts per state.
 * T (outside text fields, or on the row's own controls) turns the lens on and focuses the slider,
 * or turns it off; Esc on the slider gives focus back to the table. `announce` speaks key presses.
 */
export function TemperatureControl({ announce }: { announce: (text: string) => void }) {
  const id = useId();
  const kelvin = useAppStore((s) => s.lens.temperature);
  const slider = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLInputElement>(null);
  // The last temperature shown, so turning the lens back on returns to it.
  const last = useRef(kelvin ?? ROOM);
  const focusSlider = useRef(false);
  // True while a key moves the slider, which then steps without snapping to the detents.
  const keyStep = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyT' || e.metaKey || e.ctrlKey || e.altKey) return;
      const own = e.target === slider.current || e.target === toggle.current;
      if (!own && isTextEntry(e.target)) return;
      if (document.querySelector('dialog:modal')) return;
      e.preventDefault();
      const store = useAppStore.getState();
      if (store.lens.temperature === null) {
        focusSlider.current = true;
        store.setLensTemperature(last.current);
        announce(`Temperature lens: ${formatTemperature(last.current)}`);
      } else {
        if (own) document.getElementById('scene')?.focus();
        store.setLensTemperature(null);
        announce('Temperature lens off');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [announce]);

  // Remember the temperature; focus moves once the slider exists, after the render that turned
  // the lens on.
  useEffect(() => {
    if (kelvin !== null) last.current = kelvin;
    if (kelvin !== null && focusSlider.current) {
      focusSlider.current = false;
      slider.current?.focus();
    }
  }, [kelvin]);

  return (
    <div className="temp-lens">
      <div className="lens-row">
        <label htmlFor={`${id}-on`}>
          Temperature <kbd>T</kbd>
        </label>
        <input
          ref={toggle}
          id={`${id}-on`}
          type="checkbox"
          className="temp-toggle"
          checked={kelvin !== null}
          aria-keyshortcuts="T"
          onChange={(e) => {
            set(e.target.checked ? last.current : null);
          }}
        />
      </div>
      {kelvin !== null && (
        <>
          <div className="temp-slider">
            <input
              ref={slider}
              id={`${id}-t`}
              type="range"
              min={0}
              max={STEPS}
              step={1}
              value={Math.round(positionOf(kelvin) * STEPS)}
              aria-label="Temperature"
              aria-valuetext={valueText(kelvin)}
              aria-describedby={`${id}-v`}
              aria-keyshortcuts="T"
              onChange={(e) => {
                set(sliderKelvin(Number(e.target.value) / STEPS, !keyStep.current));
                keyStep.current = false;
              }}
              onKeyDown={(e) => {
                keyStep.current = STEP_KEYS.has(e.key);
                if (e.key === 'Escape') {
                  e.preventDefault();
                  document.getElementById('scene')?.focus();
                }
              }}
            />
            <span className="temp-ticks" aria-hidden="true">
              {DETENTS.map((d) => (
                <span
                  key={d.kelvin}
                  className="temp-tick"
                  style={{ '--at': positionOf(d.kelvin) } as CSSProperties}
                />
              ))}
            </span>
          </div>
          <output id={`${id}-v`} htmlFor={`${id}-t`} className="temp-value">
            {formatTemperature(kelvin)}
          </output>
          <div className="temp-detents" role="group" aria-label="Temperature presets">
            {DETENTS.map((d) => (
              <button
                key={d.kelvin}
                type="button"
                aria-pressed={kelvin === d.kelvin}
                onClick={() => {
                  set(d.kelvin);
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <Suspense>
            <TemperatureSummary kelvin={kelvin} />
          </Suspense>
        </>
      )}
    </div>
  );
}
