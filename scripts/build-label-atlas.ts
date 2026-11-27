/// <reference lib="dom" />
// Bakes the tile labels' glyphs into a signed distance field atlas (docs/adr/0013-label-atlas.md).
// Run with `npm run atlas` after changing the label font or the element symbols. Chromium (from
// Playwright, already a dev dependency) rasterises each glyph of Inter Bold 4× supersampled and
// measures it; `sdf.ts` turns the coverage into a distance field; `png.ts` writes a greyscale PNG.
// Writes src/assets/label-atlas.png and src/assets/label-atlas.json (`AtlasMetrics`).
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import elements from '../src/data/elements.json' with { type: 'json' };
import type { AtlasMetrics, GlyphMetrics } from '../src/core/labelLayout.ts';
import { encodeGreyPng } from './png.ts';
import { encodeField, signedDistance } from './sdf.ts';

const FONT = new URL(
  '../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff',
  import.meta.url,
);
const OUT_PNG = new URL('../src/assets/label-atlas.png', import.meta.url);
const OUT_JSON = new URL('../src/assets/label-atlas.json', import.meta.url);

/** Atlas pixels per em. */
const EM = 48;
/** Supersampling of the rasterised glyphs before the distance field is shrunk to `EM`. */
const SUPER = 4;
/** Field reach beyond the edge, in atlas pixels; also each cell's padding. */
const SPREAD = 6;
const ATLAS_WIDTH = 512;

const labels = [...elements.map((e) => e.symbol), ...elements.map((e) => String(e.number))];
const chars = [...new Set(labels.join(''))].toSorted();
const pairs = [
  ...new Set(labels.flatMap((t) => [...t].slice(1).map((c, i) => t[i] + c))),
].toSorted();

interface Raster {
  ch: string;
  advance: number;
  /** Cell size and pen origin inside it, in atlas pixels. */
  width: number;
  height: number;
  originX: number;
  originY: number;
  /** Coverage at SUPER× the cell size, row-major. */
  coverage: number[];
}

const fontData = (await readFile(FONT)).toString('base64');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(
    `<style>@font-face { font-family: Label; font-weight: 700; src: url(data:font/woff;base64,${fontData}) format('woff'); }</style>`,
  );
  const measured = await page.evaluate(
    async ({ glyphChars, kernPairs, emPx, superSample, pad }) => {
      await document.fonts.load(`700 ${emPx}px Label`);
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
      ctx.font = `700 ${emPx}px Label`;
      const em = (px: number) => px / emPx;
      const line = ctx.measureText('H');
      const kerning: Record<string, number> = {};
      for (const pair of kernPairs) {
        const k =
          ctx.measureText(pair).width -
          ctx.measureText(pair[0]!).width -
          ctx.measureText(pair[1]!).width;
        if (Math.abs(k) > 1e-6) kerning[pair] = em(k);
      }
      const rasters = glyphChars.map((ch) => {
        ctx.font = `700 ${emPx}px Label`;
        const m = ctx.measureText(ch);
        const originX = pad + Math.ceil(m.actualBoundingBoxLeft);
        const originY = pad + Math.ceil(m.actualBoundingBoxAscent);
        const width = originX + Math.ceil(m.actualBoundingBoxRight) + pad;
        const height = originY + Math.ceil(m.actualBoundingBoxDescent) + pad;
        const canvas = document.createElement('canvas');
        canvas.width = width * superSample;
        canvas.height = height * superSample;
        const c = canvas.getContext('2d', { willReadFrequently: true })!;
        c.font = `700 ${emPx * superSample}px Label`;
        c.fillStyle = '#fff';
        c.fillText(ch, originX * superSample, originY * superSample);
        const rgba = c.getImageData(0, 0, canvas.width, canvas.height).data;
        const coverage: number[] = [];
        for (let i = 3; i < rgba.length; i += 4) coverage.push(rgba[i]!);
        return { ch, advance: em(m.width), width, height, originX, originY, coverage };
      });
      return {
        ascent: em(line.fontBoundingBoxAscent),
        descent: em(line.fontBoundingBoxDescent),
        kerning,
        rasters,
      };
    },
    { glyphChars: chars, kernPairs: pairs, emPx: EM, superSample: SUPER, pad: SPREAD },
  );

  // Shelf-pack the cells left to right, tallest first.
  const rasters: Raster[] = measured.rasters.toSorted((a, b) => b.height - a.height);
  const glyphs: Record<string, GlyphMetrics> = {};
  const cells: { x: number; y: number; r: Raster; bytes: Uint8Array }[] = [];
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const r of rasters) {
    if (x + r.width > ATLAS_WIDTH) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    const field = signedDistance(r.width * SUPER, r.height * SUPER, Uint8Array.from(r.coverage));
    const { bytes } = encodeField(field, r.width * SUPER, r.height * SUPER, SUPER, SPREAD);
    cells.push({ x, y, r, bytes });
    glyphs[r.ch] = {
      advance: r.advance,
      plane: [
        -r.originX / EM,
        -(r.height - r.originY) / EM,
        (r.width - r.originX) / EM,
        r.originY / EM,
      ],
      atlas: [x, y, r.width, r.height],
    };
    x += r.width;
    shelf = Math.max(shelf, r.height);
  }
  const used = y + shelf;
  const height = 2 ** Math.ceil(Math.log2(used));

  const pixels = new Uint8Array(ATLAS_WIDTH * height);
  for (const cell of cells)
    for (let row = 0; row < cell.r.height; row++)
      pixels.set(
        cell.bytes.subarray(row * cell.r.width, (row + 1) * cell.r.width),
        (cell.y + row) * ATLAS_WIDTH + cell.x,
      );

  const metrics: AtlasMetrics = {
    width: ATLAS_WIDTH,
    height,
    em: EM,
    spread: SPREAD,
    ascent: measured.ascent,
    descent: measured.descent,
    glyphs: Object.fromEntries(Object.entries(glyphs).toSorted(([a], [b]) => (a < b ? -1 : 1))),
    kerning: measured.kerning,
  };
  await writeFile(OUT_PNG, encodeGreyPng(pixels, ATLAS_WIDTH, height));
  await writeFile(OUT_JSON, `${JSON.stringify(metrics, null, 2)}\n`);
  console.log(
    `label atlas: ${chars.length} glyphs, ${Object.keys(metrics.kerning).length} kerned pairs, ${ATLAS_WIDTH}×${height}`,
  );
} finally {
  await browser.close();
}
