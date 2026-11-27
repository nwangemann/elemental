# 15. No preload hints for the scene

- Status: accepted
- Date: 2026-11-26
- Amends: [ADR 3](0003-bundle-budget.md)

## Context

ADR 3 loads the scene lazily and left one follow-up: if the extra round trip shows up, preload the scene chunk with a `modulepreload` hint from a small Vite plugin. On the slow profile of `npm run perf` (1.6 Mbps down, 150 ms round trip) the shell paints at 0.73 s, requests the scene chunk at the same moment, and the visitor can first move at 2.27 s. The label atlas image (32 KB) is fetched once the scene chunk runs.

## Measurements

A build-only plugin added the hints to `index.html` (`transformIndexHtml` over the bundle: the scene chunk, its static imports not already in the shell, and the atlas with `crossorigin="anonymous"` to match `TextureLoader`). Medians of three cold loads, headless Chromium, production build:

| Variant                          | Slow: first paint | Slow: first move | Fast: first move |
| -------------------------------- | ----------------- | ---------------- | ---------------- |
| No hints (today)                 | 0.73 s            | 2.27 s           | 0.61 s           |
| Scene chunks and atlas preloaded | 1.35 s            | 2.20 s           | 0.65 s           |
| Same, `fetchpriority="low"`      | 1.35 s            | 2.20 s           | 0.65 s           |
| Atlas only                       | 0.90 s            | 2.42 s           | 0.61 s           |

The slow profile is bound by bandwidth, not round trips: about 290 KB of gzipped JavaScript and image at 200 KB/s is about 1.5 s of transfer in any order. Preloading moves the scene download forward, so it shares the line with the shell: first paint comes 0.62 s later for a first move 0.07 s sooner. Chromium's throttled connections did not honour `fetchpriority`.

## Decision

- **No preload hints.** `index.html` stays as Vite writes it. The shell paints first, then the scene loads.
- The lever for slow connections is fewer bytes (data trim, smaller renderer code), not request order.

## Consequences

- The earliest feedback a visitor on a slow link gets (the heading and the loading status) stays at about 0.7 s.
- A real HTTP/2 server that honours priorities might let a low-priority preload overlap without delaying the shell. That cannot be measured with the local throttled server; revisit if the app gets a host that can be profiled.
