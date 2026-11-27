import type { Element } from './elements/index.ts';

/**
 * The discovery timeline (ADR 0019): which elements were known in a given year, the slider's
 * scale with its Antiquity stop, and the year's deep link. An element counts as discovered from
 * the year it was first recognised as a new substance (`yearDiscovered`, with the isolation-year
 * overrides in `elements/normalize.ts`); elements known since antiquity are always known.
 */

type Dated = Pick<Element, 'yearDiscovered' | 'discoveredInAntiquity'>;

/** The year that stands for antiquity: before every dated discovery, so only antiquity is known. */
export const ANTIQUITY = -Infinity;

/** The first year on the slider after the Antiquity stop. */
export const YEAR_MIN = 1650;

/** The latest discovery in the data (tennessine, 2010): from here on every element is known. */
export const YEAR_MAX = 2010;

/** Whether `e` was known in `year` (`ANTIQUITY` for the Antiquity stop). */
export function knownBy(e: Dated, year: number): boolean {
  if (e.discoveredInAntiquity) return true;
  return e.yearDiscovered !== null && e.yearDiscovered <= year;
}

/** Writes 1 for each element not yet discovered in `year` and 0 for the rest (null = lens off). */
export function discoveryTargets(
  elements: readonly Dated[],
  year: number | null,
  out: Float32Array,
): Float32Array {
  for (let i = 0; i < elements.length; i++)
    out[i] = year === null || knownBy(elements[i]!, year) ? 0 : 1;
  return out;
}

/** How many elements were known in `year`, and how many were still to come. */
export function discoveryCounts(
  elements: readonly Dated[],
  year: number,
): { known: number; toCome: number } {
  let known = 0;
  for (const e of elements) if (knownBy(e, year)) known++;
  return { known, toCome: elements.length - known };
}

/**
 * Elements discovered after `from` and up to `to` (either order: the range runs from the
 * smaller year, exclusive, to the larger, inclusive), by year and then atomic number. Antiquity
 * elements are never in it, since they are known at every stop. For "1898: Ne, Kr, Xe, Po, Ra".
 */
export function discoveredIn<E extends Dated & Pick<Element, 'number'>>(
  elements: readonly E[],
  from: number,
  to: number,
): E[] {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return elements
    .filter((e) => e.yearDiscovered !== null && e.yearDiscovered > lo && e.yearDiscovered <= hi)
    .toSorted((a, b) => a.yearDiscovered! - b.yearDiscovered! || a.number - b.number);
}

/**
 * The slider's scale, piecewise linear. The Antiquity stop sits at 0. A short gap leads to
 * 1650, then 1650–1750 (four discoveries: P, Co, Pt, Zn) is compressed into a tenth of the
 * track, and 1750–2010, which holds almost every discovery, fills the rest at about 0.33% of
 * the track per year.
 */
const KNOTS: readonly (readonly [p: number, year: number])[] = [
  [0.05, YEAR_MIN],
  [0.15, 1750],
  [1, YEAR_MAX],
];

/** The year at slider position `p` (0–1, clamped), in whole years, or `ANTIQUITY` near 0. */
export function yearAt(p: number): number {
  const c = Math.min(1, Math.max(0, p));
  const [p0, y0] = KNOTS[0]!;
  if (c < p0 / 2) return ANTIQUITY;
  if (c <= p0) return y0;
  for (let i = 1; i < KNOTS.length; i++) {
    const [pa, ya] = KNOTS[i - 1]!;
    const [pb, yb] = KNOTS[i]!;
    if (c <= pb) return Math.round(ya + ((c - pa) / (pb - pa)) * (yb - ya));
  }
  return YEAR_MAX;
}

/** The slider position (0–1) of `year` (`ANTIQUITY` at 0, others clamped); inverse of `yearAt`. */
export function positionOfYear(year: number): number {
  if (year === ANTIQUITY) return 0;
  const y = Math.min(YEAR_MAX, Math.max(YEAR_MIN, year));
  for (let i = 1; i < KNOTS.length; i++) {
    const [pa, ya] = KNOTS[i - 1]!;
    const [pb, yb] = KNOTS[i]!;
    if (y <= yb) return pa + ((y - ya) / (yb - ya)) * (pb - pa);
  }
  return 1;
}

/** Years the slider snaps to, with their labels. */
export const YEAR_DETENTS: readonly { year: number; label: string }[] = [
  { year: ANTIQUITY, label: 'Antiquity' },
  { year: 1789, label: "Lavoisier's list" },
  { year: 1869, label: "Mendeleev's table" },
  { year: YEAR_MAX, label: 'Today' },
];

/** How close, in slider position, a drag must come to a detent to snap to it (about 3 years). */
export const YEAR_DETENT_WINDOW = 0.01;

/**
 * The year a slider drag at `p` sets: the detent it snaps to, or `yearAt(p)`. Keyboard steps
 * pass `snap: false`, so a one-year step is never held on a detent.
 */
export function sliderYear(p: number, snap = true): number {
  if (snap)
    for (const d of YEAR_DETENTS)
      if (Math.abs(positionOfYear(d.year) - p) <= YEAR_DETENT_WINDOW) return d.year;
  return yearAt(p);
}

/** A year as the lens shows it: "Antiquity", "1869". */
export function yearLabel(year: number): string {
  return year === ANTIQUITY ? 'Antiquity' : String(year);
}

/** The counts in words, as the lens announces them: "64 known, 54 to come". */
export function discoverySummary(counts: { known: number; toCome: number }): string {
  return `${String(counts.known)} known, ${String(counts.toCome)} to come`;
}

/** The query parameter the year takes in a deep link: `#/Ne?year=1869`, `?year=antiquity`. */
export const YEAR_PARAM = 'year';

/** The year in a deep link's query (whole, clamped to the scale, or `ANTIQUITY`), or null. */
export function yearFromHash(hash: string): number | null {
  const q = hash.indexOf('?');
  if (q < 0) return null;
  const raw = new URLSearchParams(hash.slice(q + 1)).get(YEAR_PARAM)?.trim();
  if (raw === undefined || raw === '') return null;
  if (raw.toLowerCase() === 'antiquity') return ANTIQUITY;
  const y = Number(raw);
  if (!Number.isFinite(y)) return null;
  return Math.min(YEAR_MAX, Math.max(YEAR_MIN, Math.round(y)));
}

/** A year as a deep link writes it: `1869`, or `antiquity` for the stop. */
export function yearParam(year: number): string {
  return year === ANTIQUITY ? 'antiquity' : String(year);
}
