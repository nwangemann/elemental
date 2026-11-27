# Performance

Budgets and how to measure them. The decisions behind them are in [ADR 3](adr/0003-bundle-budget.md) (bundle) and [ADR 10](adr/0010-performance-pass.md) (this pass).

## Budgets

| What                                   | Budget                  | Enforced by     |
| -------------------------------------- | ----------------------- | --------------- |
| Shell JavaScript (gzipped)             | 100 KB (ceiling 80 KB)  | `npm run check` |
| All JavaScript (gzipped)               | 450 KB (ceiling 380 KB) | `npm run check` |
| Time to first move, fast connection    | 2 s                     | `npm run perf`  |
| Frame work while walking, p95          | 8 ms                    | `npm run perf`  |
| Frame rate on an integrated-GPU laptop | 60 fps                  | manual check    |

## Measuring

- `npm run size:check` (part of `npm run check`) builds the app, fails above the ceilings and prints the gzipped JavaScript by npm package, with the chunks each package lands in. It splits each minified chunk by its sourcemap and gzips each package's part alone, so the parts add up to a few KB more than the real total; read them as shares. Bytes no source maps to are listed per chunk: in `elementFacts` that is the element data JSON, in `Scene` mostly the namespace object the bundler writes for `import * as THREE`.
- `npm run perf` builds the app, serves it and runs `e2e/perf/perf.spec.ts` in Chromium. It prints three JSON lines. `perf:load` holds the median time to first move on the fast connection and, per load, first paint, the scene chunk's request and arrival, the first scene frame and the first move, in milliseconds from navigation. `perf:load-slow` holds the same on a slow connection (1.6 Mbps down, 150 ms round trip, Lighthouse's mobile profile); it has no budget and is the baseline for load work. `perf:frames` holds the median, p95 and worst frame work while walking, the draw calls and the pixel ratio.
- `?perf` on any build shows draw calls, triangles, mean and p95 frame interval and the pixel ratio in an overlay. The numbers are also on its `data-*` attributes.
- `?quality=off` pins the pixel ratio. Use it when the browser throttles the frame loop (headless, embedded previews), which the adaptive resolution would otherwise read as a slow GPU.

## Latest numbers

2026-11-26, M1 Pro, headless Chromium, production build:

- Time to first move, fast connection: 0.6 s median (scene chunk arrives at 0.32 s, first frame at 0.58 s).
- Time to first move, slow connection: 2.6 s median. First paint at 0.73 s; the scene chunk is requested only then (0.72 s) and arrives at 2.46 s, so its download sits behind the shell's.
- Frame work while walking: 0.5 ms median, 0.7 ms p95; 11 draw calls.
- JavaScript: 71 KB shell, 377 KB total (ceilings 80 and 380 KB).

Gzipped JavaScript by package (`npm run size:check`, each part gzipped alone):

| Package                                     | KB    | Chunk        |
| ------------------------------------------- | ----- | ------------ |
| three                                       | 179.0 | Scene        |
| react-dom                                   | 62.2  | shell        |
| @react-three/fiber                          | 51.2  | Scene        |
| troika-three-text and its helpers           | 44.1  | Scene        |
| app code                                    | 20.7  | all          |
| element data JSON                           | 9.9   | elementFacts |
| bundler output (`THREE` namespace, runtime) | 5.2   | Scene, shell |
| react, scheduler                            | 4.5   | shell        |
| small React Three Fiber helpers, zustand    | 3.4   | Scene, shell |

The troika row is troika-three-text 30.3, bidi-js 5.8, webgl-sdf-generator 4.2, troika-three-utils 2.0 and troika-worker-utils 1.8 KB, plus a 31 KB woff fetched at load. three is not tree-shaken because React Three Fiber imports and extends its whole namespace.
