import { useMemo, type CSSProperties } from 'react';
import { ELEMENTS } from '../core/elements/index.ts';
import { lensLegend, type LensKey } from '../core/lens.ts';
import { COLOUR_RAMP, NO_DATA_COLOUR } from '../core/palette.ts';

// The ramp's stops, for the bar's gradient in CSS (which blends in linear light, as the tiles'
// `rampColour` does, where the browser can).
const BAR = { '--ramp': COLOUR_RAMP.join(', ') } as CSSProperties;

/**
 * The colour lens's legend: the property, a gradient bar (decorative: the ends are given as text),
 * the lowest and highest values with units, "log scale" when the ramp spreads on one, and a swatch
 * for elements with no value.
 */
export function ColourLegend({ lensKey }: { lensKey: LensKey }) {
  const legend = useMemo(() => lensLegend(ELEMENTS, lensKey), [lensKey]);
  if (!legend) return null;
  return (
    <figure className="colour-legend">
      <figcaption>
        {legend.label}
        {legend.log && <span className="colour-legend-log"> · log scale</span>}
      </figcaption>
      <div className="colour-legend-bar" aria-hidden="true" style={BAR} />
      <p className="colour-legend-ends">
        <span>
          <span className="visually-hidden">Lowest: </span>
          {legend.min}
        </span>
        <span>
          <span className="visually-hidden">Highest: </span>
          {legend.max}
        </span>
      </p>
      {legend.noData > 0 && (
        <p className="colour-legend-nodata">
          <span
            className="colour-legend-swatch"
            aria-hidden="true"
            style={{ background: NO_DATA_COLOUR }}
          />
          No data ({legend.noData})
        </p>
      )}
    </figure>
  );
}
