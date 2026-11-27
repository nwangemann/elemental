import { useEffect, useMemo, useRef, useState } from 'react';
import {
  discoveryCounts,
  discoveryNews,
  discoverySummary,
  latestDiscoveries,
} from '../core/discovery.ts';
import { ELEMENTS } from '../core/elements/index.ts';
import { ANNOUNCE_DELAY_MS } from './ScrubLens.tsx';

/**
 * The discovery lens's counts ("63 known, 55 to come") and the latest finds up to the year
 * ("1868: He"). The visible lines follow the slider at once; a polite live region speaks the
 * counts once a drag pauses, with what was discovered (or undone) since the last time it spoke,
 * so a sweep across 1898 is heard as "Discovered: Ra, Po, Xe, Kr, Ne". While `quiet` (the play
 * sweep) it says nothing and keeps up with the year, so nothing is spoken when the sweep stops.
 */
export function DiscoverySummary({ year, quiet = false }: { year: number; quiet?: boolean }) {
  const counts = useMemo(() => discoverySummary(discoveryCounts(ELEMENTS, year)), [year]);
  const latest = useMemo(() => latestDiscoveries(ELEMENTS, year), [year]);
  const [spoken, setSpoken] = useState('');
  // The year last spoken; the first announcement gives the counts alone.
  const lastSpoken = useRef<number | null>(null);

  useEffect(() => {
    if (quiet) {
      lastSpoken.current = year;
      return;
    }
    if (year === lastSpoken.current) return;
    const t = setTimeout(() => {
      const from = lastSpoken.current;
      lastSpoken.current = year;
      const news = from === null ? '' : discoveryNews(ELEMENTS, from, year);
      setSpoken(news ? `${counts}. ${news}` : counts);
    }, ANNOUNCE_DELAY_MS);
    return () => {
      clearTimeout(t);
    };
  }, [year, counts, quiet]);

  return (
    <div className="era-summary">
      <p className="scrub-summary" aria-hidden="true">
        {counts}
      </p>
      {latest && (
        <p className="scrub-summary era-latest" aria-hidden="true">
          Latest: {latest}
        </p>
      )}
      <span className="visually-hidden" aria-live="polite">
        {spoken}
      </span>
    </div>
  );
}
