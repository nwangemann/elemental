import { describe, expect, it } from 'vitest';
import { ELEMENTS } from './elements/index.ts';
import { deepLink, parseDeepLink } from './explorer.ts';
import {
  DETENTS,
  DETENT_WINDOW,
  kelvinAt,
  PHASE_CODE,
  phaseAt,
  phaseCounts,
  phaseTargets,
  positionOf,
  snapKelvin,
  T_MAX,
  temperatureFromHash,
} from './temperature.ts';

const bySymbol = (s: string) => ELEMENTS.find((e) => e.symbol === s)!;
const ROOM = 298.15;
const BODY = 310.15;

describe('phaseAt', () => {
  it('matches the standard state at room temperature for every element with a melting point', () => {
    const withMp = ELEMENTS.filter((e) => e.meltingPoint !== null);
    expect(withMp).toHaveLength(103);
    for (const e of withMp)
      expect([e.symbol, phaseAt(e, ROOM)]).toEqual([e.symbol, e.standardState]);
  });

  it('melts gallium, caesium and nothing else new at body temperature', () => {
    for (const s of ['Ga', 'Cs']) expect(phaseAt(bySymbol(s), BODY)).toBe('liquid');
    expect(phaseAt(bySymbol('Rb'), BODY)).toBe('solid');
    expect(phaseAt(bySymbol('Hg'), BODY)).toBe('liquid');
    expect(phaseAt(bySymbol('Br'), BODY)).toBe('liquid');
    // Francium melts at about 300 K but has no boiling point, so above it the lens does not guess.
    expect(phaseAt(bySymbol('Fr'), BODY)).toBe('unknown');
    expect(phaseAt(bySymbol('Fr'), ROOM)).toBe('solid');
  });

  it('sublimes arsenic: solid then gas, never liquid', () => {
    const as = bySymbol('As');
    expect(phaseAt(as, 800)).toBe('solid');
    expect(phaseAt(as, 900)).toBe('gas');
    for (let k = 0; k <= T_MAX; k += 10) expect(phaseAt(as, k)).not.toBe('liquid');
  });

  it('keeps helium liquid down to 0 K at 1 atm', () => {
    const he = bySymbol('He');
    expect(phaseAt(he, 0)).toBe('liquid');
    expect(phaseAt(he, 0.5)).toBe('liquid');
    expect(phaseAt(he, 5)).toBe('gas');
  });

  it('gives a melting point or boiling point to the warmer state', () => {
    const fe = bySymbol('Fe');
    expect(phaseAt(fe, fe.meltingPoint!)).toBe('liquid');
    expect(phaseAt(fe, fe.boilingPoint!)).toBe('gas');
  });

  it('shows no guess where the data stops', () => {
    for (const e of ELEMENTS.filter((x) => x.number >= 104)) {
      expect(phaseAt(e, ROOM)).toBe('unknown');
      expect(phaseAt(e, 3000)).toBe('unknown');
    }
    const at = bySymbol('At');
    expect(phaseAt(at, at.meltingPoint! - 1)).toBe('solid');
    expect(phaseAt(at, at.meltingPoint! + 1)).toBe('unknown');
  });
});

describe('phaseTargets and phaseCounts', () => {
  it('writes one code per tile and counts agree with it', () => {
    const out = phaseTargets(ELEMENTS, BODY, new Float32Array(ELEMENTS.length));
    expect(out[bySymbol('Ga').number - 1]).toBe(PHASE_CODE.liquid);
    expect(out[0]).toBe(PHASE_CODE.gas);
    expect(out[25]).toBe(PHASE_CODE.solid);
    const counts = phaseCounts(ELEMENTS, BODY);
    expect(counts.solid + counts.liquid + counts.gas + counts.unknown).toBe(118);
    expect(counts.liquid).toBe(out.filter((c) => c === PHASE_CODE.liquid).length);
    expect(counts).toEqual({ solid: 87, liquid: 4, gas: 11, unknown: 16 });
  });

  it('turns everything with data to gas at the top of the scale', () => {
    const counts = phaseCounts(ELEMENTS, T_MAX);
    expect(counts.gas).toBe(93);
    expect(counts.unknown).toBe(25);
  });
});

describe('slider scale', () => {
  it('runs 0 to T_MAX and round-trips', () => {
    expect(kelvinAt(0)).toBe(0);
    expect(kelvinAt(1)).toBeCloseTo(T_MAX, 6);
    for (let p = 0; p <= 1; p += 0.01) expect(positionOf(kelvinAt(p))).toBeCloseTo(p, 9);
    for (const k of [0, 0.5, 4.2, ROOM, 1811, 5869])
      expect(kelvinAt(positionOf(k))).toBeCloseTo(k, 6);
  });

  it('is monotonic, clamps, and gives the low range room', () => {
    let last = -1;
    for (let p = 0; p <= 1; p += 0.001) {
      const k = kelvinAt(p);
      expect(k).toBeGreaterThan(last);
      last = k;
    }
    expect(kelvinAt(-1)).toBe(0);
    expect(kelvinAt(2)).toBeCloseTo(T_MAX, 6);
    expect(positionOf(-50)).toBe(0);
    expect(positionOf(1e6)).toBe(1);
    expect(positionOf(400)).toBeGreaterThan(0.4);
  });

  it('snaps to detents within the window and nowhere else', () => {
    for (const d of DETENTS) {
      const p = positionOf(d.kelvin);
      expect(snapKelvin(p)).toBe(d.kelvin);
      expect(snapKelvin(p + DETENT_WINDOW * 0.9)).toBe(d.kelvin);
      expect(snapKelvin(p - DETENT_WINDOW * 0.9)).toBe(d.kelvin);
    }
    const far = positionOf(1000);
    expect(snapKelvin(far)).toBeCloseTo(1000, 6);
    // Room and body temperature are close on the track; their windows must not overlap.
    expect(positionOf(BODY) - positionOf(ROOM)).toBeGreaterThan(2 * DETENT_WINDOW);
  });
});

describe('temperature deep link', () => {
  it('reads ?t= in kelvin', () => {
    expect(temperatureFromHash('#/Ga?t=310.15')).toBe(310.15);
    expect(temperatureFromHash('#/Ga?lens=density&t=0')).toBe(0);
    expect(temperatureFromHash('#/Ga?t=99999')).toBe(T_MAX);
    expect(temperatureFromHash('#/Ga?t=-4')).toBe(0);
    expect(temperatureFromHash('#/Ga')).toBeNull();
    expect(temperatureFromHash('#/Ga?t=')).toBeNull();
    expect(temperatureFromHash('#/Ga?t=hot')).toBeNull();
  });

  it('round-trips through deepLink beside the other lenses', () => {
    const ga = bySymbol('Ga');
    expect(deepLink(ga, null, null, BODY)).toBe('#/Ga?t=310.15');
    expect(deepLink(ga, 'density', 'meltingPoint', 1200)).toBe(
      '#/Ga?lens=density&colour=meltingPoint&t=1200',
    );
    expect(deepLink(ga, null, null, 1 / 3)).toBe('#/Ga?t=0.33');
    for (const k of [0, 0.5, ROOM, BODY, 373.15, T_MAX]) {
      const hash = deepLink(ga, null, null, k);
      expect(temperatureFromHash(hash)).toBe(k);
      expect(parseDeepLink(hash, ELEMENTS)).toBe(ga);
    }
  });
});
