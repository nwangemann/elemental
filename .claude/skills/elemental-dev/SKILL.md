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

The workspace `.claude/launch.json` defines `elemental-web` on port 5174, so it does not clash with another Vite app on 5173.

## Gotchas

- Prettier realigns markdown tables. A scripted edit that matches an old row text silently does nothing; find the row by its first cell, then run Prettier. `docs:check` catches a missing dependency row at commit time.
- `npm run data` hits PubChem and Wikidata live. Run it only when refreshing data; tests use the fixtures in `src/core/elements/__fixtures__/`.
- Scripts run with Node 24's built-in TypeScript support, so imports inside `src/core` use explicit `.ts` extensions.

