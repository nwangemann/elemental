import { Suspense, lazy } from 'react';
import { YEAR_DETENTS, positionOfYear, sliderYear, yearLabel } from '../core/discovery.ts';
import { useAppStore } from '../state/store.ts';
import { ScrubLens } from './ScrubLens.tsx';

// The counts read the element data, so they share the data chunk and load once the lens is on.
const DiscoverySummary = lazy(() =>
  import('./DiscoverySummary.tsx').then((m) => ({ default: m.DiscoverySummary })),
);

/** Phones show the people's names alone, so the four presets fit on one line. */
const SHORT: Readonly<Record<string, string>> = {
  "Lavoisier's list": 'Lavoisier',
  "Mendeleev's table": 'Mendeleev',
};
const DETENT_VALUES = YEAR_DETENTS.map((d) => ({
  value: d.year,
  label: d.label,
  ...(SHORT[d.label] && { short: SHORT[d.label] }),
}));
/** Mendeleev's table: where the lens turns on the first time. */
const INITIAL_YEAR = 1869;

function setYear(year: number | null) {
  useAppStore.getState().setLensYear(year);
}

/**
 * The discovery lens's row in the lens control (`ScrubLens`, key Y): a slider over the timeline
 * (`positionOfYear`, snapping through `sliderYear`), the year or "Antiquity", presets Antiquity,
 * Lavoisier's list, Mendeleev's table and Today, and the counts with the latest discoveries.
 */
export function DiscoveryControl({ announce }: { announce: (text: string) => void }) {
  const year = useAppStore((s) => s.lens.year);
  return (
    <ScrubLens
      label="Discovery"
      code="KeyY"
      shortcut="Y"
      value={year}
      setValue={setYear}
      initial={INITIAL_YEAR}
      positionOf={positionOfYear}
      valueAt={sliderYear}
      format={yearLabel}
      detents={DETENT_VALUES}
      className="era-lens"
      announce={announce}
    >
      {year !== null && (
        <Suspense>
          <DiscoverySummary year={year} />
        </Suspense>
      )}
    </ScrubLens>
  );
}
