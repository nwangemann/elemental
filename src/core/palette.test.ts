import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './elements/categories.ts';
import { CATEGORY_COLORS, LABEL_COLOR, contrastRatio, luminance } from './palette.ts';

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });
});

describe('CATEGORY_COLORS', () => {
  it('has a colour for every family', () => {
    expect(Object.keys(CATEGORY_COLORS).toSorted()).toEqual(CATEGORIES.toSorted());
  });

  it('keeps tile labels readable on every family (WCAG AA, 4.5:1)', () => {
    for (const color of Object.values(CATEGORY_COLORS)) {
      expect(contrastRatio(color, LABEL_COLOR)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps families visibly distinct', () => {
    const colors = Object.values(CATEGORY_COLORS).map(rgb);
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const d = Math.hypot(...colors[i]!.map((c, k) => c - colors[j]![k]!));
        expect(d).toBeGreaterThan(40);
      }
    }
  });
});
