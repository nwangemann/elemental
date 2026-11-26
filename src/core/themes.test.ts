import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './elements/categories.ts';
import { CATEGORY_COLORS, PANEL_COLOR, PANEL_MUTED, PANEL_TEXT, contrastRatio } from './palette.ts';
import { THEMES, accentTokens, surfaceAt, themeOf } from './themes.ts';

const HEX = /^#[0-9a-f]{6}$/;

describe('THEMES', () => {
  it('has a theme for every family, built on the family colour', () => {
    expect(Object.keys(THEMES).toSorted()).toEqual(CATEGORIES.toSorted());
    for (const category of CATEGORIES) {
      expect(themeOf(category).color).toBe(CATEGORY_COLORS[category]);
    }
  });

  it('keeps every surface value in range', () => {
    for (const { awake, accent, accentInk } of Object.values(THEMES)) {
      for (const v of [awake.roughness, awake.metalness, awake.pulse]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(awake.glow).toBeGreaterThanOrEqual(0);
      expect(awake.glow).toBeLessThanOrEqual(2);
      for (const c of [awake.glowColor, accent, accentInk]) expect(c).toMatch(HEX);
    }
  });
});

describe('accentTokens', () => {
  it('comes from the theme', () => {
    for (const category of CATEGORIES) {
      expect(accentTokens(category)).toEqual({
        accent: THEMES[category].accent,
        accentInk: THEMES[category].accentInk,
      });
    }
  });

  it('keeps accent text and panel text readable on the panel (WCAG AA, 4.5:1)', () => {
    expect(contrastRatio(PANEL_TEXT, PANEL_COLOR)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(PANEL_MUTED, PANEL_COLOR)).toBeGreaterThanOrEqual(4.5);
    for (const category of CATEGORIES) {
      const { accent, accentInk } = accentTokens(category);
      expect(contrastRatio(accent, PANEL_COLOR)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(accent, accentInk)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('surfaceAt', () => {
  const awake = { roughness: 0.2, metalness: 1, glow: 0.8, glowColor: '#ffffff', pulse: 0.5 };
  const base = { roughness: 0.6, metalness: 0 };
  const out = new Float32Array(8);

  it('sits part way toward the family at rest, without glow', () => {
    surfaceAt(awake, base, 0.25, 0, out);
    expect(out[0]).toBeCloseTo(0.5);
    expect(out[1]).toBeCloseTo(0.25);
    expect(out[2]).toBe(0);
    expect(out[3]).toBe(0);
  });

  it('reaches the awake surface at full activation', () => {
    surfaceAt(awake, base, 0.25, 1, out, 4);
    expect([...out.subarray(4)].map((v) => +v.toFixed(5))).toEqual([0.2, 1, 0.8, 0.5]);
  });

  it('blends monotonically in between', () => {
    surfaceAt(awake, base, 0.25, 0.5, out);
    expect(out[0]).toBeLessThan(0.5);
    expect(out[0]).toBeGreaterThan(0.2);
    expect(out[2]).toBeCloseTo(0.4);
  });
});
