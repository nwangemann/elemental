# 10. Performance pass: adaptive resolution, worker-built labels and a perf script

- Status: accepted
- Date: 2026-11-26

## Context

The MVP target is 60 fps on an integrated-GPU laptop and a first move within 2 s on a fast connection (ADR 0003). Before this pass nothing adapted to a slow GPU, nothing measured the time to first move, and the scene chunk's extra round trip (ADR 0003) was unmeasured.

A first measurement of the production build showed the scene chunk arriving about 0.3 s after navigation on a throttled fast connection, but the first frame only after about 1.5 s. A CPU profile put almost all of the gap in one blocking `readPixels` call inside troika-three-text: on its first text request troika renders a test glyph on a second WebGL context and reads it back, to warm up its GPU glyph generator. It also builds every glyph's signed distance field on the main thread with the same GPU path.

The bundle has 5 KB of headroom under its 380 KB ceiling, so drei (for `PerformanceMonitor`) was not worth adding for one small component.

## Decision

- **Labels build their glyphs in troika's workers.** `Labels.tsx` sets `gpuAccelerateSDF = false` on each label and on the batch. A small build-only Vite plugin (`scripts/troika-no-sdf-warmup.ts`) removes troika's warm-up call from the production bundle. The plugin fails the build if the call is not found, so an upgrade of troika is checked by hand rather than silently re-adding the delay. The dev server keeps the warm-up.
- **Adaptive resolution with our own governor** (`core/quality.ts`, applied by `scene/QualityGovernor.tsx`). It averages frame intervals over one-second windows after a two-second warm-up, steps the device pixel ratio down by 0.25 below about 45 fps and back up above about 57 fps, between 0.75 and the display's own ratio (capped at 2). Gaps over 250 ms count as pauses. After three changes of direction it settles on the lower ratio. `?quality=off` pins the ratio.
- **Reduced motion:** besides the skipped establishing shot and the panel fade, a fly-to under `prefers-reduced-motion` cuts the camera to the tile (`snapFocus`) instead of gliding.
- **`npm run perf`** (`e2e/perf/perf.spec.ts`, its own Playwright config, not part of `test:e2e`) measures the production build. It reports time to first move: the median of three cold-cache loads on a throttled fast connection (20 Mbps, 40 ms round trip), after warming the browser's GPU process on a blank page. It also reports frame work while walking (each frame's callbacks plus `gl.finish`, at a pinned ratio), with draw calls and pixel ratio. It fails above 2 s first move or 8 ms p95 frame work.
- **No `modulepreload` for the scene chunk.** It is requested about 10 ms after the entry runs and arrives well inside the budget; the preload would save one round trip of a 0.6 s first move.

## Consequences

- Time to first move dropped from a median of about 1.5 s to about 0.6 s (M1 Pro, headless Chromium, throttled). Labels may appear a moment after the first frame while the workers finish; nothing else waits for them.
- The governor reads frame intervals, so it cannot tell a slow GPU from a frame loop the browser throttles (headless Chromium, a hidden or embedded page at 30 Hz): there it lowers the ratio although the scene is cheap. Measurements use `?quality=off`. A GPU timer query would be the better signal, but browsers do not expose one reliably.
- The plugin ties the build to troika's internal code: a troika update that renames the call fails the build until the plugin is adjusted or removed.
- Not yet measured on an integrated-GPU laptop; the 60 fps target stays a manual check.
