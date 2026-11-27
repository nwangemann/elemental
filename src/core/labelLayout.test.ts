import { describe, expect, it } from 'vitest';
import atlas from '../assets/label-atlas.json' with { type: 'json' };
import { ELEMENTS } from './elements/index.ts';
import {
  labelInstances,
  layoutText,
  textWidth,
  type AtlasMetrics,
  type GlyphMetrics,
} from './labelLayout.ts';

const glyph = (advance: number, x: number): GlyphMetrics => ({
  advance,
  plane: [-0.1, -0.2, advance + 0.1, 0.8],
  atlas: [x, 0, 10, 20],
});

const METRICS: AtlasMetrics = {
  width: 100,
  height: 40,
  em: 10,
  spread: 1,
  ascent: 0.9,
  descent: 0.3,
  glyphs: { A: glyph(0.6, 0), V: glyph(0.5, 10) },
  kerning: { AV: -0.1 },
};

describe('textWidth', () => {
  it('sums advances and kerning', () => {
    expect(textWidth(METRICS, 'AV')).toBeCloseTo(1.0);
    expect(textWidth(METRICS, 'VA')).toBeCloseTo(1.1);
  });

  it('names a missing glyph', () => {
    expect(() => textWidth(METRICS, 'Q')).toThrow(/"Q"/);
  });
});

describe('layoutText', () => {
  it('left/top: pen starts at 0, baseline one ascent below the top', () => {
    const [a] = layoutText(METRICS, 'A', 2, 'left', 'top');
    expect(a!.x0).toBeCloseTo(-0.2);
    expect(a!.x1).toBeCloseTo(1.4);
    expect(a!.y1).toBeCloseTo((-0.9 + 0.8) * 2);
    expect(a!.y0).toBeCloseTo((-0.9 - 0.2) * 2);
  });

  it('center/middle: centres the advance width and the line box', () => {
    const [a, v] = layoutText(METRICS, 'AV', 1, 'center', 'middle');
    // Width 1.0, so the pen starts at −0.5; V follows A's advance plus the AV kerning.
    expect(a!.x0).toBeCloseTo(-0.6);
    expect(v!.x0).toBeCloseTo(-0.5 + 0.6 - 0.1 - 0.1);
    // Line box from +0.6 (top) to −0.6 (bottom): baseline at 0.6 − 0.9.
    expect(a!.y1).toBeCloseTo(-0.3 + 0.8);
  });

  it('maps atlas pixels to UVs', () => {
    const [, v] = layoutText(METRICS, 'AV', 1, 'left', 'top');
    expect([v!.u0, v!.v0, v!.u1, v!.v1]).toEqual([0.1, 0, 0.2, 0.5]);
  });
});

describe('labelInstances', () => {
  it('lays text flat with its top towards −z', () => {
    const out = labelInstances(METRICS, [
      { tile: 7, text: 'A', size: 1, anchorX: 'left', anchorY: 'top', x: 10, z: 20 },
    ]);
    expect(out.count).toBe(1);
    expect(out.tile[0]).toBe(7);
    const [x0, z0, x1, z1] = out.rect;
    expect(x0).toBeCloseTo(9.9);
    expect(x1).toBeCloseTo(10.7);
    // Text y up becomes world −z: the glyph top (y −0.1) sits at z 20.1, its bottom at z 21.1.
    expect(z0).toBeCloseTo(20.1);
    expect(z1).toBeCloseTo(21.1);
  });
});

describe('the committed atlas', () => {
  const metrics = atlas as unknown as AtlasMetrics;

  it('has every glyph the labels use', () => {
    for (const e of ELEMENTS) {
      expect(() => textWidth(metrics, e.symbol)).not.toThrow();
      expect(() => textWidth(metrics, String(e.number))).not.toThrow();
    }
  });

  it('keeps every glyph cell inside the image', () => {
    for (const g of Object.values(metrics.glyphs)) {
      const [x, y, w, h] = g.atlas;
      expect(x + w).toBeLessThanOrEqual(metrics.width);
      expect(y + h).toBeLessThanOrEqual(metrics.height);
    }
  });
});
