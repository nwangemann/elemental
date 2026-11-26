# 2. Scene rendering

- Status: accepted
- Date: 2026-11-26

## Context

The scene is a flat table of 118 tiles, a character and per-tile effects, next to real DOM interface (element panel, explorer, settings). It must hold 60 fps on an integrated-GPU laptop with fewer than 50 draw calls when idle. Every tile needs a crisp symbol and atomic number at any zoom.

## Decision

- **three.js 0.187 through React Three Fiber 9.** The scene and the DOM interface share one component model and one store. Vanilla three was the alternative; it was rejected because the explorer and panels are real UI and would need a second state bridge. Rule: per-frame work lives in `useFrame` and mutates refs and reused objects; it never sets React state.
- **WebGL2 `WebGLRenderer`, not `WebGPURenderer`.** Postprocessing and helper-library support for WebGPU/TSL is still thinner. Revisit in a later record, with measurements.
- **All tiles in one `InstancedMesh`**, coloured per instance by family. One draw call for the whole table.
- **Labels as SDF text with `troika-three-text`, merged with its `BatchedText`** into one draw call for all 236 labels. The font (Inter Bold, Latin) is bundled through `@fontsource/inter`, so no glyphs are fetched at runtime. A baked glyph atlas was the alternative; troika was kept because it is crisp at every zoom, needs no build step, and batching removes its per-label draw-call cost.
- **No physics engine.** The character moves kinematically on a plane and the tile under it comes from grid maths (`tileAtPoint`).
- Visual parameters live in one typed object, `src/core/config.ts`, so a tuning panel can edit them and they are testable outside React.

## Consequences

- drei is not installed yet; add it when a helper earns its place rather than by default.
- troika builds text in a web worker, so labels appear a moment after the tiles on first load.
- The labels are built imperatively in an effect (not as JSX) so React's StrictMode remount never reuses a disposed batch.
