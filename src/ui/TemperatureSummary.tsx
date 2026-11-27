import { useEffect, useMemo, useState } from 'react';
import { ELEMENTS } from '../core/elements/index.ts';
import { phaseCounts, phaseSummary } from '../core/temperature.ts';

/** How long the temperature must stay put before the counts are announced. */
const ANNOUNCE_DELAY_MS = 600;

/**
 * The temperature lens's counts per state. The visible line follows the slider at once; the polite
 * live region repeats it only once a drag pauses, so a screen reader hears one summary, not dozens.
 */
export function TemperatureSummary({ kelvin }: { kelvin: number }) {
  const text = useMemo(() => phaseSummary(phaseCounts(ELEMENTS, kelvin)), [kelvin]);
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
      <p className="temp-counts" aria-hidden="true">
        {text}
      </p>
      <span className="visually-hidden" aria-live="polite">
        {spoken}
      </span>
    </>
  );
}
