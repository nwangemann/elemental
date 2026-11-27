import { Suspense, lazy } from 'react';
import { formatTemperature } from '../core/elementFacts.ts';
import { DETENTS, positionOf, sliderKelvin } from '../core/temperature.ts';
import { useAppStore } from '../state/store.ts';
import { ScrubLens } from './ScrubLens.tsx';

// The counts read the element data, so they share the data chunk and load once the lens is on.
const TemperatureSummary = lazy(() =>
  import('./TemperatureSummary.tsx').then((m) => ({ default: m.TemperatureSummary })),
);

const DETENT_VALUES = DETENTS.map((d) => ({ value: d.kelvin, label: d.label }));

function setTemperature(k: number | null) {
  useAppStore.getState().setLensTemperature(k);
}

/**
 * The temperature lens's row in the lens control (`ScrubLens`, key T): a slider over the
 * non-linear 0–6,000 K scale (`positionOf`, snapping through `sliderKelvin`), the value in kelvin
 * and Celsius, presets Room, Body and Water boils, and the counts per state.
 */
export function TemperatureControl({ announce }: { announce: (text: string) => void }) {
  const kelvin = useAppStore((s) => s.lens.temperature);
  return (
    <ScrubLens
      label="Temperature"
      code="KeyT"
      shortcut="T"
      value={kelvin}
      setValue={setTemperature}
      initial={DETENTS[0]!.kelvin}
      positionOf={positionOf}
      valueAt={sliderKelvin}
      format={formatTemperature}
      detents={DETENT_VALUES}
      className="temp-lens"
      announce={announce}
    >
      {kelvin !== null && (
        <Suspense>
          <TemperatureSummary kelvin={kelvin} />
        </Suspense>
      )}
    </ScrubLens>
  );
}
