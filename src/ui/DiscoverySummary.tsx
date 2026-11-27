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
 * so a sweep across 1898 is heard as "Discovered: Ra, Po, Xe, Kr, Ne".
 */
export function DiscoverySummary({ year }: { year: number }) {
  const counts = useMemo(() => discoverySummary(discoveryCounts(ELEMENTS, year)), [year]);
  const latest = useMemo(() => latestDiscoveries(ELEMENTS, year), [year]);
  const [spoken, setSpoken] = useState('');
  // The year last spoken; the first announcement gives the counts alone.
  const lastSpoken = useRef<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const from = lastSpoken.current;
      lastSpoken.current = year;
      const news = from === null ? '' : discoveryNews(ELEMENTS, from, year);
      setSpoken(news ? `${counts}. ${news}` : counts);
    }, ANNOUNCE_DELAY_MS);
    return () => {
      clearTimeout(t);
    };
  }, [year, counts]);

  return (
    <>
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
    </>
  );
}
