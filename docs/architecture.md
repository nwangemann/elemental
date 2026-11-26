# Architecture

## Layers

- `src/core`: pure TypeScript. Maths, layout, data shaping, rules. No React, no three, no DOM, so everything here is unit-tested in Node.
- `src/scene` (from milestone 1): React Three Fiber components. Per-frame work happens in `useFrame` and mutates refs; it never sets React state.
- `src/ui` (from milestone 1): DOM interface (element panel, explorer, settings).
- `src/data`: generated element data (`elements.json`), committed. Built by `scripts/build-elements.ts`; see [data sources](data-sources.md).

## Core modules

- `damp.ts`: frame-rate independent smoothing for camera follow and movement.
- `elements/schema.ts`: the zod schema and `Element` type, and the ten families that drive tile colours and themes.
- `elements/position.ts`: period, group and block from the atomic number.
- `elements/normalize.ts`: turns PubChem's table and Wikidata's SPARQL rows into validated elements. Used by the build script and its tests.
- `elements/index.ts`: `ELEMENTS`, the committed dataset, and lookups. This is what the app imports.

## Testing

- Unit tests (`*.test.ts` next to the code) cover `src/core`. The normalizer is tested against small recorded responses in `src/core/elements/__fixtures__/`; another test validates the whole committed dataset.
- `e2e/smoke.spec.ts` builds the app, serves it with `vite preview` and checks it loads in Chromium.
