# Architecture

## Layers

- `src/core`: pure TypeScript. Maths, layout, data shaping, rules. No React, no three, no DOM, so everything here is unit-tested in Node.
- `src/scene` (from milestone 1): React Three Fiber components. Per-frame work happens in `useFrame` and mutates refs; it never sets React state.
- `src/ui` (from milestone 1): DOM interface (element panel, explorer, settings).
- `src/data` (from milestone 1): generated element data, committed, built by a script in `scripts/`.

## Core modules

- `damp.ts`: frame-rate independent smoothing for camera follow and movement.

## Testing

- Unit tests (`*.test.ts` next to the code) cover `src/core`.
- `e2e/smoke.spec.ts` builds the app, serves it with `vite preview` and checks it loads in Chromium.
