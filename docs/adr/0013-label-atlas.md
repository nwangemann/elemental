# 13. Tile labels from a baked SDF atlas

- Status: accepted
- Date: 2026-11-26
- Supersedes: the label part of [ADR 2](0002-scene-rendering.md) and of [ADR 10](0010-performance-pass.md)

## Context

The 236 tile labels (symbol and atomic number) were troika-three-text SDF text in one `BatchedText`. It worked, but cost 44 KB of gzipped JavaScript (troika, bidi-js, its SDF generator and worker utilities), a 31 KB woff fetched at load, a pool of web workers building glyphs after the first frame, and a build plugin patching troika's internals to skip its blocking GPU warm-up. The labels never change text: 55 glyphs of one font cover every symbol and number. The coming height lens moves every tile at once, so labels must follow tile heights cheaply, and the explorer's filters dim tiles but could not dim troika's batched labels.

## Decision

- **Bake the glyphs at build time.** `npm run atlas` (`scripts/build-label-atlas.ts`) launches Playwright's Chromium (already a dev dependency), rasterises each glyph the labels use from Inter Bold at 4× supersampling, measures advances, kerning pairs and the font's line box with canvas `measureText`, computes an exact signed distance field (Felzenszwalb–Huttenlocher, `scripts/sdf.ts`), shrinks it to 48 px per em with a 6 px spread, and writes a 512 × 256 greyscale PNG (`scripts/png.ts`) and its metrics JSON to `src/assets`. Both are committed; the font package becomes a dev dependency.
- **Lay out in core.** `src/core/labelLayout.ts` turns metrics and label specs into per-glyph rectangles and UVs, matching the anchors troika used (symbol centred on its advance width and line box, number from the line box's top-left).
- **Draw one instanced quad per glyph.** `Labels.tsx` builds an `InstancedBufferGeometry` (a unit quad; per instance a world rectangle, UVs and a height) with a small `ShaderMaterial` that smooths the edge by `fwidth`, and takes the scene's fog and tone mapping. Each glyph's height is its tile's top, rewritten only for dirty tiles, so labels ride rising tiles. One draw call, as before.

## Consequences

- Gzipped JavaScript drops from 327 to 287 KB; the woff fetch is replaced by a 32 KB PNG. No workers, no troika build plugin. Frame work while walking fell from 0.6 / 0.7 ms to 0.3 / 0.4 ms (median / p95), and the slow-connection first move from 2.37 to 2.18 s. Labels appear as soon as the atlas image decodes, not after worker round trips.
- Text is limited to glyphs in the atlas. A new symbol or font means re-running `npm run atlas`; a unit test fails if any label needs a missing glyph. There is no bidi, wrapping or font fallback, which the labels never needed.
- Per-instance data makes per-label effects cheap: dimming labels on filtered tiles and easing them with the height lens are attribute writes.
- Magnified far past 48 px per em, SDF edges round slightly at sharp corners; at the default camera distance the labels are as crisp as troika's were.
