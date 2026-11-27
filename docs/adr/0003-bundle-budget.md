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

## Amendment (2026-11-26): ceilings lowered

The optimisation pass cut the total from 361 KB to 289 KB: the curated `three` namespace (ADR 12), the baked label atlas in place of troika (ADR 13) and the trimmed element data (ADR 17). The shell is 71 KB. The ceilings now sit just above those sizes again, 76 KB for the shell and 300 KB in total, so the savings cannot drift back unnoticed. The budgets (100 KB and 450 KB) are unchanged. The element data has since moved to its own `elements` chunk, which the shell's list view can load without three.

## Amendment (2026-11-26): room for Combine mode

The discovery timeline (ADR 19) brought the total to 299 KB against the 300 KB ceiling; the shell is 71 KB. Combine mode (ADR 20) is estimated at 6–10 KB of code and about 6 KB of data, gzipped, all in its own lazy chunk. The total ceiling rises to 318 KB for that phase; once it is built, the ceiling drops back to just above the measured total. The shell ceiling stays at 76 KB, and the 450 KB budget is unchanged.

## Amendment (2026-11-26): forming ships the shapes

Forming (the ball-and-stick models, lattice chunks and ingots) brings the baked shapes into combine's lazy chunk: about 6 KB gzipped of coordinates and bonds for 39 compounds, plus about 2 KB of code. The total reached 321 KB against the 318 KB ceiling. Rounding the coordinates to 0.1 Å would save only about 1 KB, so the shapes keep their 0.01 Å precision and the total ceiling rises to 324 KB. Nothing new loads before Combine first opens. The shell ceiling (76 KB) and the 450 KB budget are unchanged; the drop back to just above the measured total still comes when the phase is built.

## Amendment (2026-11-27): contexts

Combine's contexts (Your body, Air, Kitchen, Earth & building) light their elements, raise tiles by each element's share by mass, and give the element panel a "Found in" list. The composition tables and the code that reads them are about 2 KB gzipped, in a small `contexts` chunk shared by the panel, the scene, the explorer's deep links and the tray, since all four need it. The total reached 326 KB against the 324 KB ceiling; the ceiling rises to 327 KB. Formula parsing moved out of the compound normaliser on the way, so this chunk does not pull in zod (which would have added 23 KB). The shell ceiling (76 KB) and the 450 KB budget are unchanged; the drop back to just above the measured total comes when the phase is built.

## Amendment (2026-11-27): data trim, headroom for the next phase

Combine's scale ladder left the total at 327 KB, exactly the ceiling. The generated data was trimmed rather than the ceiling raised, without changing a value the app reads:

- **Tables by column.** `elements.json` and `compounds.json` store one array per field instead of one object per row (`core/columns.ts`), so each field name ships once, not 118 or 40 times. This reverses ADR 17's choice of one object per element, which turned down the same 2 KB as not worth a decoder; at the ceiling it is. The app turns them back into rows as their chunks load. Element data 8.9 → 6.6 KB, compound set 5.8 → 5.4 KB.
- **Crystal bonds found, not stored.** A crystal chunk's bond list was longer than its atoms. `compound-shapes.json` now stores, per crystal, the longest bond for each element pair (the same rules the data script cut with), and `crystalBonds` (`core/forming.ts`) finds the bonds once when the forming chunk loads; a test checks every crystal gets the same bonds it was baked with. Shapes 6.3 → 5.0 KB.

The total is 324 KB. The ceiling stays at 327 KB on purpose: the 3 KB between them is room for the next phase, which lowers the ceiling to just above its measured total when it is built. The shell ceiling (76 KB) and the 450 KB budget are unchanged. The scene's error boundary and its no-WebGL fallback, added the same day, took about 1 KB of that room (total 325 KB).
