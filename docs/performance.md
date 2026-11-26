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

- `npm run perf` builds the app, serves it and runs `e2e/perf/perf.spec.ts` in Chromium. It prints two JSON lines. `perf:load` holds the median time to first move and, per load, first paint, the scene chunk's request and arrival, the first scene frame and the first move, in milliseconds from navigation. `perf:frames` holds the median, p95 and worst frame work while walking, the draw calls and the pixel ratio.
- `?perf` on any build shows draw calls, triangles, mean and p95 frame interval and the pixel ratio in an overlay. The numbers are also on its `data-*` attributes.
- `?quality=off` pins the pixel ratio. Use it when the browser throttles the frame loop (headless, embedded previews), which the adaptive resolution would otherwise read as a slow GPU.

## Latest numbers

2026-11-26, M1 Pro, headless Chromium, production build: time to first move 0.6 s median (scene chunk arrives at 0.33 s, first frame at 0.58 s); frame work while walking 0.6 ms median, 0.7 ms p95; 11 draw calls; JavaScript 71 KB shell, 375 KB total.
