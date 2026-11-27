# Performance

Budgets and how to measure them. The decisions behind them are in [ADR 3](adr/0003-bundle-budget.md) (bundle) and [ADR 10](adr/0010-performance-pass.md) (this pass).

## Budgets

| What                                   | Budget                  | Enforced by     |
| -------------------------------------- | ----------------------- | --------------- |
| Shell JavaScript (gzipped)             | 100 KB (ceiling 76 KB)  | `npm run check` |
| All JavaScript (gzipped)               | 450 KB (ceiling 300 KB) | `npm run check` |
| Time to first move, fast connection    | 2 s                     | `npm run perf`  |
| Frame work while walking, p95          | 8 ms                    | `npm run perf`  |
| Frame rate on an integrated-GPU laptop | 60 fps                  | manual check    |

## Measuring

- `npm run size:check` (part of `npm run check`) builds the app, fails above the ceilings and prints the gzipped JavaScript by npm package, with the chunks each package lands in. It splits each minified chunk by its sourcemap and gzips each package's part alone, so the parts add up to a few KB more than the real total; read them as shares. Bytes no source maps to are listed per chunk: in `elements` that is the element data JSON (ADR 17), in `Scene` a little bundler runtime.
- `npm run perf` builds the app, serves it and runs `e2e/perf/perf.spec.ts` in Chromium. It prints six JSON lines. `perf:load` holds the median time to first move on the fast connection and, per load, first paint, the scene chunk's request and arrival, the first scene frame and the first move, in milliseconds from navigation. `perf:load-slow` holds the same on a slow connection (1.6 Mbps down, 150 ms round trip, Lighthouse's mobile profile); it has no budget and is the baseline for load work. `perf:frames` holds the median, p95 and worst frame work while walking, the draw calls and the pixel ratio. `perf:tint` holds the same while walking with a colour lens on and switching it four times, so the whole table eases. `perf:temp` holds the same while walking with the temperature lens on and sweeping it from room temperature to 6,000 K and back, so tiles melt, boil (float and fade) and condense. `perf:idle` counts frames drawn over five still seconds, after the establishing shot and the idle settle time ([ADR 16](adr/0016-idle-frame-pacing.md)).
- `?perf` on any build shows draw calls, triangles, mean and p95 frame interval and the pixel ratio in an overlay. While the scene is still the interval is the idle rate (about 50 ms); walk to read frame cost. The numbers are also on its `data-*` attributes.
- `?quality=off` pins the pixel ratio. Use it when the browser throttles the frame loop (headless, embedded previews), which the adaptive resolution would otherwise read as a slow GPU.

## Latest numbers

2026-11-26, M1 Pro, headless Chromium, production build:

- Time to first move, fast connection: 0.60 s median (scene chunk arrives at 0.32 s, first frame at 0.58 s).
- Time to first move, slow connection: 2.27 s median. First paint at 0.73 s; the scene chunk is requested then and arrives at 2.1 s. The connection is bandwidth-bound: preloading the scene was measured and rejected ([ADR 15](adr/0015-no-preload-hints.md)).
- Frame work while walking: 0.3 ms median, 0.4 ms p95; 11 draw calls. The same while the colour lens eases, and while the temperature lens sweeps (0.3 ms median, 0.4 ms p95).
- Idle: 23 fps headless, 21 fps in a 120 Hz browser pane (was the display rate).
- JavaScript: 71 KB shell, 294 KB total (ceilings 76 and 300 KB). Plus the 32 KB label atlas image, fetched with the scene.

Gzipped JavaScript by package (`npm run size:check`, each part gzipped alone):

| Package                                  | KB    | Chunk        |
| ---------------------------------------- | ----- | ------------ |
| three                                    | 131.5 | Scene        |
| react-dom                                | 62.2  | shell        |
| @react-three/fiber                       | 51.1  | Scene        |
| app code                                 | 28.6  | all          |
| element data JSON                        | 8.9   | elements     |
| bundler runtime                          | 3.7   | Scene, shell |
| react, scheduler                         | 4.5   | shell        |
| small React Three Fiber helpers, zustand | 3.4   | Scene, shell |

Tile labels cost no library: they draw from a baked atlas (ADR 13), which replaced 44 KB of troika text code and its 31 KB font fetch. three is tree-shaken: in the production build React Three Fiber sees a curated `three` namespace instead of the whole one (ADR 0012).
