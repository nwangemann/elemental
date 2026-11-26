import type { Category } from './elements/categories.ts';
import type { Element } from './elements/schema.ts';

/**
 * Turns an element into the text the element panel shows: labelled rows with units, ready to
 * render. Missing values read "Unknown"; predicted values say so. Pure, so the wording and the
 * unit conversions are unit-tested.
 */

/** One labelled value in the panel. `note` qualifies it ("predicted"). */
export interface Fact {
  label: string;
  value: string;
  note?: string;
}

export const UNKNOWN = 'Unknown';

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  alkali: 'Alkali metal',
  'alkaline-earth': 'Alkaline earth metal',
  transition: 'Transition metal',
  'post-transition': 'Post-transition metal',
  metalloid: 'Metalloid',
  nonmetal: 'Nonmetal',
  halogen: 'Halogen',
  'noble-gas': 'Noble gas',
  lanthanide: 'Lanthanide',
  actinide: 'Actinide',
};

const MINUS = '−';
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

function superscript(digits: string): string {
  return [...digits].map((d) => (d === '-' ? '⁻' : (SUPERSCRIPT_DIGITS[Number(d)] ?? d))).join('');
}

/** Formats a number for reading: up to `digits` significant figures, a real minus sign. */
export function formatNumber(value: number, digits = 4): string {
  const abs = Math.abs(value);
  let text: string;
  if (abs !== 0 && (abs < 0.001 || abs >= 1e6)) {
    const [mantissa = '', exponent = ''] = value.toExponential(digits - 1).split('e');
    text = `${String(Number(mantissa))} × 10${superscript(String(Number(exponent)))}`;
  } else {
    text = String(Number(value.toPrecision(digits)));
  }
  return text.replaceAll('-', MINUS);
}

/** A temperature in kelvin, with degrees Celsius alongside: "273.2 K (0 °C)". */
export function formatTemperature(kelvin: number | null): string {
  if (kelvin === null) return UNKNOWN;
  const celsius = Math.round((kelvin - 273.15) * 10) / 10;
  return `${formatNumber(kelvin)} K (${formatNumber(celsius)} °C)`;
}

/** Density. Gases read in g/L (the g/cm³ figure is a tiny decimal), everything else in g/cm³. */
export function formatDensity(density: number | null, state: Element['standardState']): string {
  if (density === null) return UNKNOWN;
  return state === 'gas' ? `${formatNumber(density * 1000)} g/L` : `${formatNumber(density)} g/cm³`;
}

/** Oxidation states with explicit signs, most positive first: "+3, +1, −1". */
export function formatOxidationStates(states: readonly number[]): string {
  if (states.length === 0) return UNKNOWN;
  return states
    .toSorted((a, b) => b - a)
    .map((s) => (s > 0 ? `+${String(s)}` : s < 0 ? `${MINUS}${String(-s)}` : '0'))
    .join(', ');
}

/** Electron configuration with superscript counts: "[Ne] 3s² 3p⁴". */
export function formatConfiguration(configuration: string): string {
  return configuration
    .replace(/\]\s*/, '] ')
    .replace(
      /([spdfg])(\d+)/g,
      (_, orbital: string, count: string) => orbital + superscript(count),
    );
}

function measured(value: number | null, unit: string): string {
  return value === null ? UNKNOWN : `${formatNumber(value)}${unit ? ` ${unit}` : ''}`;
}

function list(items: readonly string[]): string {
  if (items.length === 0) return UNKNOWN;
  if (items.length === 1) return items[0] ?? UNKNOWN;
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1) ?? ''}`;
}

function predicted(fact: Fact, isPredicted: boolean): Fact {
  return isPredicted ? { ...fact, note: 'predicted' } : fact;
}

/** Where the element sits in the table: "Period 2 · Group 16 · p-block". */
export function placement(e: Element): string {
  const group = e.group === null ? 'f-block series' : `Group ${String(e.group)}`;
  return `Period ${String(e.period)} · ${group} · ${e.block}-block`;
}

/** The overview: family, state, place in the table, discovery and name. */
export function overviewFacts(e: Element): Fact[] {
  const discovered = e.discoveredInAntiquity
    ? 'Known since antiquity'
    : e.yearDiscovered === null
      ? UNKNOWN
      : String(e.yearDiscovered);
  const facts: Fact[] = [
    { label: 'Family', value: CATEGORY_LABELS[e.category] },
    predicted(
      { label: 'State at room temperature', value: capitalize(e.standardState) },
      e.standardStateIsPredicted,
    ),
    { label: 'Atomic mass', value: `${formatNumber(e.atomicMass, 6)} u` },
    predicted(
      { label: 'Electron configuration', value: formatConfiguration(e.electronConfiguration) },
      e.electronConfigurationIsPredicted,
    ),
    { label: 'Discovered', value: discovered },
  ];
  if (e.discoverers.length > 0) facts.push({ label: 'Discovered by', value: list(e.discoverers) });
  if (e.namedAfter.length > 0) facts.push({ label: 'Named after', value: list(e.namedAfter) });
  return facts;
}

/** Physical and chemical properties, each with its unit. */
export function propertyFacts(e: Element): Fact[] {
  return [
    { label: 'Melting point', value: formatTemperature(e.meltingPoint) },
    { label: 'Boiling point', value: formatTemperature(e.boilingPoint) },
    { label: 'Density', value: formatDensity(e.density, e.standardState) },
    { label: 'Electronegativity', value: measured(e.electronegativity, '(Pauling)') },
    { label: 'Atomic radius', value: measured(e.atomicRadius, 'pm') },
    { label: 'First ionization energy', value: measured(e.ionizationEnergy, 'eV') },
    { label: 'Electron affinity', value: measured(e.electronAffinity, 'eV') },
    { label: 'Oxidation states', value: formatOxidationStates(e.oxidationStates) },
  ];
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
