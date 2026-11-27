import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { isTextEntry } from '../scene/useKeyboardInput.ts';

/** Slider steps across the whole track; each lens maps 0–1 onto its own (often non-linear) scale. */
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

/** A value the slider snaps to and a preset button sets. */
export interface Detent {
  value: number;
  label: string;
  /** A shorter label that phones show on the button ("Mendeleev"); the full one stays its name. */
  short?: string;
}

export interface ScrubLensProps {
  /** The row's name: label, slider name and announcements ("Temperature"). */
  label: string;
  /** `KeyboardEvent.code` of the key that toggles the lens, and the key as shown ("KeyT", "T"). */
  code: string;
  shortcut: string;
  /** The lens's value, or null when off. */
  value: number | null;
  setValue: (value: number | null) => void;
  /** The value the lens turns on at when no earlier one is remembered. */
  initial: number;
  /** The slider position (0–1) of a value, and the value a position sets (`snap` for pointer drags). */
  positionOf: (value: number) => number;
  valueAt: (p: number, snap: boolean) => number;
  /** The value as the row shows it ("310.1 K (37 °C)"). */
  format: (value: number) => string;
  detents: readonly Detent[];
  /** Under the presets while on: usually a lazy `LiveSummary` that reads the element data. */
  children?: ReactNode;
  /** An extra class on the row, for per-lens styling and tests. */
  className?: string;
  /** Speaks key presses (the lens control's status region). */
  announce: (text: string) => void;
}

/**
 * A lens set by a value on a scale (temperature, year): a toggle, and while on a range slider of
 * `STEPS` over the lens's scale, tick marks and preset buttons for the detents, the value as an
 * `<output>`, and `children` (the counts). The shortcut (outside text fields, or on the row's own
 * controls) turns the lens on at the last value and focuses the slider, or turns it off. Pointer
 * drags snap to detents; keyboard steps do not, since one step is smaller than the snap window. Esc
 * on the slider gives focus back to the table.
 */
export function ScrubLens(props: ScrubLensProps) {
  const { label, shortcut, value, setValue, initial, positionOf, valueAt, format, detents } = props;
  const id = useId();
  const slider = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLInputElement>(null);
  // The last value shown, so turning the lens back on returns to it.
  const last = useRef(value ?? initial);
  const focusSlider = useRef(false);
  // True while a key moves the slider, which then steps without snapping to the detents.
  const keyStep = useRef(false);
  // The handler reads the latest props without re-subscribing on every render.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const p = latest.current;
      if (e.code !== p.code || e.metaKey || e.ctrlKey || e.altKey) return;
      const own = e.target === slider.current || e.target === toggle.current;
      if (!own && isTextEntry(e.target)) return;
      if (document.querySelector('dialog:modal')) return;
      e.preventDefault();
      if (p.value === null) {
        focusSlider.current = true;
        p.setValue(last.current);
        p.announce(`${p.label} lens: ${p.format(last.current)}`);
      } else {
        if (own) document.getElementById('scene')?.focus();
        p.setValue(null);
        p.announce(`${p.label} lens off`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Remember the value; focus moves once the slider exists, after the render that turned the
  // lens on.
  useEffect(() => {
    if (value !== null) last.current = value;
    if (value !== null && focusSlider.current) {
      focusSlider.current = false;
      slider.current?.focus();
    }
  }, [value]);

  const detent = value === null ? undefined : detents.find((d) => d.value === value);

  return (
    <div className={`scrub-lens ${props.className ?? ''}`}>
      <div className="lens-row">
        <label htmlFor={`${id}-on`}>
          {label} <kbd>{shortcut}</kbd>
        </label>
        <input
          ref={toggle}
          id={`${id}-on`}
          type="checkbox"
          className="scrub-toggle"
          checked={value !== null}
          aria-keyshortcuts={shortcut}
          onChange={(e) => {
            setValue(e.target.checked ? last.current : null);
          }}
        />
      </div>
      {value !== null && (
        <>
          <div className="scrub-slider">
            <input
              ref={slider}
              id={`${id}-s`}
              type="range"
              min={0}
              max={STEPS}
              step={1}
              value={Math.round(positionOf(value) * STEPS)}
              aria-label={label}
              aria-valuetext={`${format(value)}${detent ? `, ${detent.label.toLowerCase()}` : ''}`}
              aria-describedby={`${id}-v`}
              aria-keyshortcuts={shortcut}
              onChange={(e) => {
                setValue(valueAt(Number(e.target.value) / STEPS, !keyStep.current));
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
            <span className="scrub-ticks" aria-hidden="true">
              {detents.map((d) => (
                <span
                  key={d.value}
                  className="scrub-tick"
                  style={{ '--at': positionOf(d.value) } as CSSProperties}
                />
              ))}
            </span>
          </div>
          <output id={`${id}-v`} htmlFor={`${id}-s`} className="scrub-value">
            {format(value)}
          </output>
          <div className="scrub-detents" role="group" aria-label={`${label} presets`}>
            {detents.map((d) => (
              <button
                key={d.value}
                type="button"
                aria-pressed={value === d.value}
                aria-label={d.short ? d.label : undefined}
                onClick={() => {
                  setValue(d.value);
                }}
              >
                {d.short ? (
                  <>
                    <span className="detent-long">{d.label}</span>
                    <span className="detent-short">{d.short}</span>
                  </>
                ) : (
                  d.label
                )}
              </button>
            ))}
          </div>
          {props.children}
        </>
      )}
    </div>
  );
}

/** How long the value must stay put before the summary is announced. */
export const ANNOUNCE_DELAY_MS = 600;

/**
 * A scrub lens's summary line. The visible text follows the slider at once; a polite live region
 * repeats it only once a drag pauses, so a screen reader hears one summary, not dozens.
 */
export function LiveSummary({ text }: { text: string }) {
  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSpoken(text);
    }, ANNOUNCE_DELAY_MS);
    return () => {
      clearTimeout(t);
    };
  }, [text]);
  return (
    <>
      <p className="scrub-summary" aria-hidden="true">
        {text}
      </p>
      <span className="visually-hidden" aria-live="polite">
        {spoken}
      </span>
    </>
  );
}
