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
- `npx prettier --write <files>`: fixes formatting failures.

## Preview pane

The repo's `.claude/launch.json` defines `elemental-web` on port 5174, so it does not clash with another Vite app on 5173. Open `http://localhost:5174/?perf` for the draw-call and frame-time overlay.

If `preview_start` fails with "Port 5174 is already in use", another session's server is serving this folder: open `http://localhost:5174/` with `preview_start {url}` instead; it serves the same files with HMR.

With `?tune` the dev server shows a leva panel over `CONFIG`; it never exists in a production build.

The preview pane runs `requestAnimationFrame` at about 30 Hz, so the overlay's frame interval reads about 30 ms there whatever the scene costs. To measure the scene's own frame work, time each rAF callback with `gl.finish()` from the page's JavaScript console instead.

## Gotchas

- To drive `CONFIG` from the page console, import `config.ts` at the exact URL the app loaded (after an edit Vite adds `?t=…`; list it with `performance.getEntriesByType('resource')`). Another URL gives a second module instance whose `setConfig` changes nothing on screen.

- Prettier realigns markdown tables. A scripted edit that matches an old row text silently does nothing; find the row by its first cell, then run Prettier. `docs:check` catches a missing dependency row at commit time.
- `npm run data` hits PubChem and Wikidata live. Run it only when refreshing data; tests use the fixtures in `src/core/elements/__fixtures__/`.
- Scripts run with Node 24's built-in TypeScript support, so imports inside `src/core` use explicit `.ts` extensions.
- Commits run `npm run check` in the Husky hook, so `git commit` also needs Node on PATH (`export PATH=~/.local/node/bin:$PATH &&`), or the hook fails with `npm: command not found`.
- troika-three-text cannot parse woff2. Import fonts as `.woff` (or ttf/otf); a woff2 font fails silently in the scene and only logs a console error.
- `npm run check` ends with `size:check`, which builds the app (about a second) and fails above 400 KB of gzipped JS.
