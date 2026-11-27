import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  PLAY_SECONDS,
  PLAY_STEP_SECONDS,
  YEAR_DETENTS,
  YEAR_MAX,
  nextDecade,
  playStart,
  positionOfYear,
  sliderYear,
  yearAt,
  yearLabel,
} from '../core/discovery.ts';
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

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function setYear(year: number | null) {
  useAppStore.getState().setLensYear(year);
}

/**
 * Sweeps the year from where it is to today while `playing`: smoothly along the slider's track in
 * `PLAY_SECONDS` for the whole track, or a decade every `PLAY_STEP_SECONDS` under reduced motion.
 * Calls `onEnd` at today. Writes the store only when the whole year changes.
 */
function usePlay(playing: boolean, onEnd: () => void) {
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  useEffect(() => {
    if (!playing) return;
    const store = useAppStore.getState();
    if (prefersReducedMotion()) {
      let year =
        store.lens.year === null || store.lens.year >= YEAR_MAX ? -Infinity : store.lens.year;
      setYear(year);
      const timer = window.setInterval(() => {
        year = nextDecade(year);
        setYear(year);
        if (year >= YEAR_MAX) end.current();
      }, PLAY_STEP_SECONDS * 1000);
      return () => window.clearInterval(timer);
    }
    let p = playStart(store.lens.year);
    setYear(yearAt(p));
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      // A long gap (a hidden tab) resumes where it was rather than jumping ahead.
      p = Math.min(1, p + Math.min(now - last, 100) / 1000 / PLAY_SECONDS);
      last = now;
      const year = yearAt(p);
      if (year !== useAppStore.getState().lens.year) setYear(year);
      if (p >= 1) end.current();
      else frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);
}

/**
 * The discovery lens's row in the lens control (`ScrubLens`, key Y): a slider over the timeline
 * (`positionOfYear`, snapping through `sliderYear`), the year or "Antiquity", presets Antiquity,
 * Lavoisier's list, Mendeleev's table and Today, the counts with the latest discoveries, and a
 * Play button that sweeps the table to today so it assembles itself. Anything else that sets the
 * year (the slider, a preset, Y, the switch) pauses the sweep. Only its start, pause and end are
 * announced; the counts stay quiet while it plays.
 */
export function DiscoveryControl({ announce }: { announce: (text: string) => void }) {
  const year = useAppStore((s) => s.lens.year);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(
    (reason: 'pause' | 'end') => {
      setPlaying(false);
      const y = useAppStore.getState().lens.year;
      if (reason === 'end') announce('Timeline reached today');
      else if (y !== null) announce(`Timeline paused at ${yearLabel(y)}`);
    },
    [announce],
  );
  usePlay(playing, () => stop('end'));

  // Turning the lens off another way (a link without `?year=`) stops the sweep quietly.
  useEffect(
    () =>
      useAppStore.subscribe((s) => {
        if (s.lens.year === null) setPlaying(false);
      }),
    [],
  );

  const setValue = useCallback(
    (v: number | null) => {
      if (playing) stop('pause');
      setYear(v);
    },
    [playing, stop],
  );

  return (
    <ScrubLens
      label="Discovery"
      code="KeyY"
      shortcut="Y"
      value={year}
      setValue={setValue}
      initial={INITIAL_YEAR}
      positionOf={positionOfYear}
      valueAt={sliderYear}
      format={yearLabel}
      detents={DETENT_VALUES}
      className="era-lens"
      announce={announce}
    >
      {year !== null && (
        <div className="era-foot">
          <button
            type="button"
            className="era-play"
            onClick={() => {
              if (playing) {
                stop('pause');
                return;
              }
              const from = playStart(year) === 0 ? 'Antiquity' : yearLabel(year);
              announce(`Playing the timeline from ${from}`);
              setPlaying(true);
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <Suspense>
            <DiscoverySummary year={year} quiet={playing} />
          </Suspense>
        </div>
      )}
    </ScrubLens>
  );
}
