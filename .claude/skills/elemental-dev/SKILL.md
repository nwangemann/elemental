---
name: elemental-dev
description: Run, check and preview the elemental web app. Use before running any npm or npx command in this repo, and when the preview misbehaves.
---

# Working on elemental

## Environment

Node 24+ must be on PATH. If `node` is not found, add your Node install's `bin` folder to PATH first. On this machine that is `~/.local/node/bin` (agent shells don't load it): prefix commands with `export PATH=~/.local/node/bin:$PATH &&`.

## Commands

- `npm run dev`: dev server at http://localhost:5173.
- `npm run check`: types, lint, formatting, unit tests and docs. Required before finishing.
- `npm run test:e2e`: builds, serves on port 4173 and runs the Playwright smoke test.
- `npx playwright test --config playwright.perf.config.ts --trace off -g "lens|walking"`: runs only the frame-work perf tests (`perf:frames`, `perf:tint`, `perf:temp`), about 35 s; `npm run perf` also runs the slow load tests.
- `npx prettier --write <files>`: fixes formatting failures.
- Lint is oxlint (`npm run lint`), not ESLint: `npx eslint` downloads an unrelated ESLint and fails for lack of a config.

## Preview pane

The repo's `.claude/launch.json` defines `elemental-web` on port 5174, so it does not clash with another Vite app on 5173. Open `http://localhost:5174/?perf` for the draw-call and frame-time overlay.

If `preview_start` fails with "Port 5174 is already in use", another session's server is serving this folder: open `http://localhost:5174/` with `preview_start {url}` instead; it serves the same files with HMR.

`elemental-build` (port 4174) builds and serves the production build. Use it for anything that differs between dev and build: React Three Fiber's curated `three` namespace (a JSX element missing from `src/scene/threeCatalogue.ts` breaks only the build; `npm test` catches it first).

With `?tune` the dev server shows a leva panel over `CONFIG`; it never exists in a production build.

The preview pane runs `requestAnimationFrame` at about 30 Hz, so the overlay's frame interval reads about 30 ms there whatever the scene costs. To measure the scene's own frame work, time each rAF callback with `gl.finish()` from the page's JavaScript console instead.

## Gotchas

- To drive `CONFIG` from the page console, import `config.ts` at the exact URL the app loaded (after an edit Vite adds `?t=…`; list it with `performance.getEntriesByType('resource')`). Another URL gives a second module instance whose `setConfig` changes nothing on screen.

- Prettier realigns markdown tables. A scripted edit that matches an old row text silently does nothing; find the row by its first cell, then run Prettier. `docs:check` catches a missing dependency row at commit time.
- `npm run data` hits PubChem and Wikidata live. Run it only when refreshing data; tests use the fixtures in `src/core/elements/__fixtures__/`.
- Scripts run with Node 24's built-in TypeScript support, so imports inside `src/core` use explicit `.ts` extensions.
- Commits run `npm run check` in the Husky hook, so `git commit` also needs Node on PATH (`export PATH=~/.local/node/bin:$PATH &&`), or the hook fails with `npm: command not found`.
- Tile labels draw from a committed atlas (`src/assets/label-atlas.*`). A label character the atlas lacks fails `npm test`; run `npm run atlas` (about 5 s, launches Playwright's Chromium) and commit both files.
- `npm run check` ends with `size:check`, which builds the app (about a second) and fails above its ceilings (shell 76 KB, total 318 KB of gzipped JS; raised for combine mode, ADR 0003).
- In a hidden pane, lens eases (0.4 s) take seconds to finish, so a screenshot right after a hash change shows the old state. Wait about 8 s before judging a lens visually.
- If the preview pane is hidden (`tabs_context` says so), rAF drops to 1–2 Hz and walking crawls: frame numbers are useless. Show it with the app's show-pane tool (`preview`) first. Failing that, measure headless with a throwaway Playwright spec in `e2e/` that wraps `requestAnimationFrame` with `gl.finish()` timing, then delete the spec.
- In the preview pane, `navigate` to the same page with a new hash only changes the hash: the page does not reload and keeps old module state. Use `location.reload()` after editing code the page read on load.
- oxlint's React rules reject assigning to a prop or hook argument inside `useFrame` (`react(immutability)`) and reading `ref.current` during render (`react(refs)`). Mutate per-frame state through a `src/core` function (`stepOrbFollow(follow, …)`, as `stepController` does), and keep render-time flags in `useState`.
- Vite tree-shakes named imports from JSON: `import { cpk } from '../data/compound-shapes.json'` ships only that key. A default import ships the whole file.
- `dev/plan.md` is long (over 70 KB). Read its "Next" line and `grep -n` the current phase rather than printing the whole file.
- Drive walking from the page console with `KeyboardEvent`s dispatched on `window` (keydown by `code`, wait, keyup); clicking the canvas is a tap-to-walk.
