# 3. Bundle budget and a lazily loaded scene

- Status: accepted
- Date: 2026-11-26

## Context

The standards set "initial JavaScript under 350 KB gzipped, including three". After the follow camera the app was one 360 KB chunk: three 154 KB, react-dom 62 KB, React Three Fiber 51 KB, the troika text family 53 KB, the rest about 10 KB. Runtime zod was already removed. Nothing large is left to cut: three, React Three Fiber and troika are the renderer (ADR 0002), and the plan still adds postprocessing (bloom), a store and the panel and explorer UI.

A single number also hides what the visitor waits for. Until the whole chunk has downloaded and run, the page shows nothing.

## Decision

- **Load the scene lazily.** `App.tsx` imports `scene/Scene.tsx` with `React.lazy`. The entry chunk holds React, react-dom and the DOM shell (heading, loading status, later the panel and explorer); three, React Three Fiber, troika and the element data come in a second chunk that the shell requests as soon as it renders.
- **Two budgets replace the single one:** the shell (the entry chunk and everything it imports statically) under 100 KB gzipped, and all JavaScript under 450 KB gzipped. The user-facing target stays: time to first move under 2 s on a fast connection.
- **`npm run size:check` enforces both,** reading the shell's chunks from the Vite manifest. Its ceilings sit just above today's sizes (shell 68 KB, total 361 KB → ceilings 80 KB and 380 KB) and are raised on purpose, in the change that needs it, never past the budget.

Alternatives considered: keeping one 350 KB budget would block bloom and the UI or force swapping out the renderer; raising it to 450 KB without splitting would keep a blank page until everything has loaded.

## Consequences

- The shell paints after about 68 KB; the scene adds one request after the entry has run. If that round trip shows up in the 2 s target, preload the scene chunk (a `modulepreload` hint from a small Vite plugin). Measured in ADR 0010: not needed, the first move comes at about 0.6 s. Tried in [ADR 15](0015-no-preload-hints.md): on a slow connection it delays the shell's first paint more than it speeds the first move, so there are no hints.
- UI that should be usable before the scene (the explorer, a text list of elements) belongs in the shell and counts against its 100 KB.
- Element data lives in the scene chunk today. If the shell needs it, split the data into its own chunk rather than pulling three into the shell.
