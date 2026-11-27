import { useEffect } from 'react';
import { deepLink, parseDeepLink } from '../core/explorer.ts';
import { ELEMENTS, elementByNumber } from '../core/elements/index.ts';
import { useAppStore } from '../state/store.ts';

/** Stands in for the scene: shows an element's panel as if the figure stood on it, and links it. */
function standOn(number: number): void {
  const e = elementByNumber(number);
  if (!e) return;
  useAppStore.getState().setActiveTile({ number: e.number, name: e.name, symbol: e.symbol });
  // The scene keeps the address on the element underfoot; here the panel's element stands in.
  history.replaceState(null, '', deepLink(e));
}

/**
 * What shows when the 3D table cannot be drawn (`SceneBoundary`). It says so, opens the panel on
 * the linked element (or hydrogen), and does the scene's job for fly-to requests: the explorer,
 * the element list, an edited link and the compound card's links switch the panel instead of
 * flying the figure there.
 */
export function SceneFallback() {
  useEffect(() => {
    standOn(parseDeepLink(window.location.hash, ELEMENTS)?.number ?? 1);
    return useAppStore.subscribe((s, prev) => {
      if (s.flight && s.flight !== prev.flight) standOn(s.flight.number);
    });
  }, []);

  return (
    <p className="loading scene-fallback" role="alert">
      This browser couldn't start 3D graphics (WebGL), so the table can't be drawn. Every element is
      still here: use Explore or List to choose one and read its panel.
    </p>
  );
}
