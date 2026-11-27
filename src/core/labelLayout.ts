// Lays out tile labels from the baked glyph atlas (docs/adr/0013-label-atlas.md). Pure: the scene
// turns the result into one instanced quad mesh, and `scripts/build-label-atlas.ts` writes the metrics.

/** One glyph in the atlas. Lengths are in em, pixel rectangles in atlas pixels (y down). */
export interface GlyphMetrics {
  /** Pen advance after this glyph. */
  advance: number;
  /** The glyph's atlas cell relative to the pen at the baseline: left, bottom, right, top (y up). */
  plane: [number, number, number, number];
  /** The same cell in the atlas image: x, y, width, height. */
  atlas: [number, number, number, number];
}

/** What the atlas build writes next to the image. */
export interface AtlasMetrics {
  /** Atlas image size in pixels. */
  width: number;
  height: number;
  /** Pixels per em in the atlas. */
  em: number;
  /** Distance, in atlas pixels, from the glyph edge to where the field reaches 0 or 255. */
  spread: number;
  /** Font line box above and below the baseline, in em (both positive). */
  ascent: number;
  descent: number;
  glyphs: Record<string, GlyphMetrics>;
  /** Extra advance between two characters, in em, keyed by the pair ("Fe"); absent means 0. */
  kerning: Record<string, number>;
}

/** Horizontal anchor: the pen start, or the middle of the advance width. */
export type AnchorX = 'left' | 'center';
/** Vertical anchor: the top of the font's line box, or its middle. */
export type AnchorY = 'top' | 'middle';

/** A glyph quad in the text plane (y up, origin at the anchor) with its atlas UVs (v down). */
export interface GlyphQuad {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/** Advance width of a string, in em, kerning included. */
export function textWidth(metrics: AtlasMetrics, text: string): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += glyphOf(metrics, text[i]!).advance;
    if (i > 0) width += metrics.kerning[text.slice(i - 1, i + 1)] ?? 0;
  }
  return width;
}

function glyphOf(metrics: AtlasMetrics, ch: string): GlyphMetrics {
  const glyph = metrics.glyphs[ch];
  if (!glyph) throw new Error(`Label atlas has no glyph for "${ch}"; run npm run atlas.`);
  return glyph;
}

/**
 * One quad per character of `text` at `size` world units per em, placed relative to the anchor
 * the way troika placed it (line box from the font's ascent and descent, width from advances).
 */
export function layoutText(
  metrics: AtlasMetrics,
  text: string,
  size: number,
  anchorX: AnchorX,
  anchorY: AnchorY,
): GlyphQuad[] {
  let pen = anchorX === 'center' ? -textWidth(metrics, text) / 2 : 0;
  const baseline = anchorY === 'top' ? -metrics.ascent : (metrics.descent - metrics.ascent) / 2;
  const quads: GlyphQuad[] = [];
  for (let i = 0; i < text.length; i++) {
    if (i > 0) pen += metrics.kerning[text.slice(i - 1, i + 1)] ?? 0;
    const glyph = glyphOf(metrics, text[i]!);
    const [left, bottom, right, top] = glyph.plane;
    const [ax, ay, aw, ah] = glyph.atlas;
    quads.push({
      x0: (pen + left) * size,
      y0: (baseline + bottom) * size,
      x1: (pen + right) * size,
      y1: (baseline + top) * size,
      u0: ax / metrics.width,
      v0: ay / metrics.height,
      u1: (ax + aw) / metrics.width,
      v1: (ay + ah) / metrics.height,
    });
    pen += glyph.advance;
  }
  return quads;
}

/** A label to place: its text, size, anchors, and the anchor point on the ground plane. */
export interface LabelSpec {
  tile: number;
  text: string;
  size: number;
  anchorX: AnchorX;
  anchorY: AnchorY;
  x: number;
  z: number;
}

/** Per-glyph instance data for the label mesh, in parallel typed arrays. */
export interface LabelInstances {
  count: number;
  /** Tile index (atomic number − 1) each glyph rides. */
  tile: Uint16Array;
  /** World-space rectangle on the ground plane: x0, z0 (text top), x1, z1 (text bottom). */
  rect: Float32Array;
  /** Atlas UVs matching `rect`: u0, v0 (top), u1, v1 (bottom). */
  uv: Float32Array;
}

/**
 * Glyph instances for labels lying flat, read from above with the text's top towards −z: text
 * x runs along world x and text y along world −z.
 */
export function labelInstances(
  metrics: AtlasMetrics,
  labels: readonly LabelSpec[],
): LabelInstances {
  const glyphs = labels.flatMap((label) =>
    layoutText(metrics, label.text, label.size, label.anchorX, label.anchorY).map((q) => ({
      label,
      q,
    })),
  );
  const out: LabelInstances = {
    count: glyphs.length,
    tile: new Uint16Array(glyphs.length),
    rect: new Float32Array(glyphs.length * 4),
    uv: new Float32Array(glyphs.length * 4),
  };
  glyphs.forEach(({ label, q }, i) => {
    out.tile[i] = label.tile;
    out.rect.set([label.x + q.x0, label.z - q.y1, label.x + q.x1, label.z - q.y0], i * 4);
    out.uv.set([q.u0, q.v0, q.u1, q.v1], i * 4);
  });
  return out;
}
