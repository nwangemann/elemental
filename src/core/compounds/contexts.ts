// What each combine mode context is made of, by mass (ADR 20): the body, dry air and the
// continental crust, transcribed from cited tables (sources in docs/data-sources.md). The
// kitchen is a list of compounds only, with no mass shares. Combine's context picker (8.9)
// lights these elements and sets tile height to each one's share through the height lens.
import { ELEMENTS } from '../elements/index.ts';
import { parseFormula } from './normalize.ts';
import type { Context } from './source.ts';

/** The reference adult's body mass, in kg, that `BODY_KG` describes. */
export const BODY_MASS_KG = 70;

/**
 * Mass of each element in a 70 kg adult, in kg (Emsley, Nature's Building Blocks, 2011, as
 * tabulated by Wikipedia's "Composition of the human body"). Elements under 1 g are left out:
 * sources disagree on them by orders of magnitude, and none would show as tile height.
 */
export const BODY_KG: Readonly<Record<string, number>> = {
  O: 45,
  C: 13,
  H: 7,
  N: 1.8,
  Ca: 1.0,
  P: 0.78,
  K: 0.14,
  S: 0.14,
  Na: 0.1,
  Cl: 0.095,
  Mg: 0.019,
  Fe: 0.0042,
  F: 0.0026,
  Zn: 0.0023,
  Si: 0.001,
};

/**
 * Dry air by volume, in parts per million, keyed by molecular formula (NASA Earth Fact Sheet,
 * updated 15 November 2024). Water vapour varies, about 1 %, and is left out, as there.
 */
export const AIR_PPMV: Readonly<Record<string, number>> = {
  N2: 780_800,
  O2: 209_500,
  Ar: 9_340,
  CO2: 420,
  Ne: 18.18,
  He: 5.24,
  CH4: 1.94,
  Kr: 1.14,
  H2: 0.55,
};

/**
 * Continental crust by mass, in mg/kg (CRC Handbook of Chemistry and Physics, 97th edition,
 * 2016, "Abundance of Elements in the Earth's Crust and in the Sea", sec. 14 p. 17). Every
 * element the table gives a value for; the rarest vary with place by orders of magnitude.
 */
export const CRUST_PPM: Readonly<Record<string, number>> = {
  O: 461_000,
  Si: 282_000,
  Al: 82_300,
  Fe: 56_300,
  Ca: 41_500,
  Na: 23_600,
  Mg: 23_300,
  K: 20_900,
  Ti: 5_650,
  H: 1_400,
  P: 1_050,
  Mn: 950,
  F: 585,
  Ba: 425,
  Sr: 370,
  S: 350,
  C: 200,
  Zr: 165,
  Cl: 145,
  V: 120,
  Cr: 102,
  Rb: 90,
  Ni: 84,
  Zn: 70,
  Ce: 66.5,
  Cu: 60,
  Nd: 41.5,
  La: 39,
  Y: 33,
  Co: 25,
  Sc: 22,
  Li: 20,
  Nb: 20,
  N: 19,
  Ga: 19,
  Pb: 14,
  B: 10,
  Th: 9.6,
  Pr: 9.2,
  Sm: 7.05,
  Gd: 6.2,
  Dy: 5.2,
  Er: 3.5,
  Ar: 3.5,
  Yb: 3.2,
  Hf: 3.0,
  Cs: 3.0,
  Be: 2.8,
  U: 2.7,
  Br: 2.4,
  Sn: 2.3,
  Ta: 2.0,
  Eu: 2.0,
  As: 1.8,
  Ge: 1.5,
  Ho: 1.3,
  W: 1.25,
  Mo: 1.2,
  Tb: 1.2,
  Tl: 0.85,
  Lu: 0.8,
  Tm: 0.52,
  I: 0.45,
  In: 0.25,
  Sb: 0.2,
  Cd: 0.15,
  Hg: 0.085,
  Ag: 0.075,
  Se: 0.05,
  Pd: 0.015,
  Bi: 0.0085,
  He: 0.008,
  Ne: 0.005,
  Pt: 0.005,
  Au: 0.004,
  Os: 0.0015,
  Te: 0.001,
  Ru: 0.001,
  Ir: 0.001,
  Rh: 0.001,
  Re: 0.0007,
  Kr: 0.0001,
  Xe: 3e-5,
  Pa: 1.4e-6,
  Ra: 9e-7,
  Ac: 5.5e-10,
  Po: 2e-10,
  Rn: 4e-13,
  Tc: 3e-15,
  Pm: 2e-23,
  Fr: 1e-24,
  At: 3e-27,
};

const MASS = new Map(ELEMENTS.map((e) => [e.symbol, e.atomicMass]));

/** Element mass shares of a gas mix given by volume (mole) fractions. Shares sum to 1. */
export function massSharesOfGases(ppmv: Readonly<Record<string, number>>): Map<string, number> {
  const mass = new Map<string, number>();
  let total = 0;
  for (const [formula, x] of Object.entries(ppmv))
    for (const [symbol, n] of parseFormula(formula)) {
      const m = x * n * MASS.get(symbol)!;
      mass.set(symbol, (mass.get(symbol) ?? 0) + m);
      total += m;
    }
  for (const [symbol, m] of mass) mass.set(symbol, m / total);
  return mass;
}

function scaled(table: Readonly<Record<string, number>>, divisor: number): Map<string, number> {
  return new Map(Object.entries(table).map(([symbol, v]) => [symbol, v / divisor]));
}

const largestFirst = (shares: Map<string, number>) =>
  new Map([...shares].toSorted((a, b) => b[1] - a[1]));

const SHARES: Readonly<Record<Exclude<Context, 'kitchen'>, ReadonlyMap<string, number>>> = {
  body: largestFirst(scaled(BODY_KG, BODY_MASS_KG)),
  air: largestFirst(massSharesOfGases(AIR_PPMV)),
  earth: largestFirst(scaled(CRUST_PPM, 1e6)),
};

/**
 * Each element's share of the context by mass (0–1), largest first, or null for the kitchen,
 * which has no single composition. The body and crust shares do not quite reach 1: the
 * smallest amounts are left out (body) or rounded (crust).
 */
export function contextShares(context: Context): ReadonlyMap<string, number> | null {
  return context === 'kitchen' ? null : SHARES[context];
}
