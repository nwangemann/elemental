# Architecture

## Layers

- `src/core`: pure TypeScript. Maths, layout, data shaping, rules. No React, no three, no DOM, so everything here is unit-tested in Node.
- `src/scene`: React Three Fiber components (see [ADR 2](adr/0002-scene-rendering.md)). Per-frame work happens in `useFrame` and mutates refs; it never sets React state.
- `src/ui` (from milestone 1): DOM interface (element panel, explorer, settings).
- `src/data`: generated element data (`elements.json`), committed. Built by `scripts/build-elements.ts`; see [data sources](data-sources.md).

## Core modules

- `damp.ts`: frame-rate independent smoothing for camera follow and movement.
- `elements/schema.ts`: the zod schema and `Element` type, and the ten families that drive tile colours and themes.
- `elements/position.ts`: period, group and block from the atomic number.
- `elements/normalize.ts`: turns PubChem's table and Wikidata's SPARQL rows into validated elements. Used by the build script and its tests.
- `elements/index.ts`: `ELEMENTS`, the committed dataset, and lookups. This is what the app imports.
- `layout.ts`: where each tile sits. An 18 × 10 grid (groups as columns, periods as rows; the two f-block rows sit under groups 3–16 after one empty row), centred on the origin of the x–z ground plane. Converts world ↔ grid and finds the tile under a point in O(1) without allocating. The lookup takes the current tile for hysteresis: a tile is kept until the character is `LAYOUT.hysteresis` past its edge, which is wider than the gap, so walking along a boundary does not flicker. Tile size, gap and margin live in `LAYOUT`.

- `config.ts`: visual and feel parameters (tile height and material, label sizes, camera) in one typed object. The shipped defaults; a tuning panel edits them live.
- `palette.ts`: the family colours, label ink, ground and sky, and WCAG contrast helpers. Tests check that label ink meets AA on every family colour.
- `frame-stats.ts`: rolling mean and percentile of frame times, allocation-free on push.

## Scene

- `Scene.tsx`: the canvas, background and fog, a hemisphere and a directional light, and the ground plane.
- `Tiles.tsx`: all 118 tiles as one `InstancedMesh`, positioned from `TILES` and coloured from `CATEGORY_COLORS`.
- `Labels.tsx`: each tile's symbol and atomic number as troika SDF text, merged into one `BatchedText`.
- `PerfProbe.tsx`: with `?perf` in the URL, an overlay shows draw calls, triangles and mean and p95 frame time twice a second. The same numbers are on the overlay's `data-calls`, `data-mean` and `data-p95` attributes for scripts.

## Testing

- Unit tests (`*.test.ts` next to the code) cover `src/core`. The normalizer is tested against small recorded responses in `src/core/elements/__fixtures__/`; another test validates the whole committed dataset.
- `scripts/size-check.mjs` builds the app and fails `npm run check` if the gzipped JavaScript passes 400 KB.
- `e2e/smoke.spec.ts` builds the app, serves it with `vite preview` and checks it loads in Chromium.
