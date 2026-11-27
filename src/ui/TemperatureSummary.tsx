import { useMemo } from 'react';
import { ELEMENTS } from '../core/elements/index.ts';
import { phaseCounts, phaseSummary } from '../core/temperature.ts';
import { LiveSummary } from './ScrubLens.tsx';

/** The temperature lens's counts per state ("87 solid, 4 liquid, 11 gas, 16 unknown"). */
export function TemperatureSummary({ kelvin }: { kelvin: number }) {
  const text = useMemo(() => phaseSummary(phaseCounts(ELEMENTS, kelvin)), [kelvin]);
  return <LiveSummary text={text} />;
}
