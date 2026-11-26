---
name: elemental-dev
description: Run, check and preview the elemental web app. Use before running any npm or npx command in this repo, and when the preview misbehaves.
---

# Working on elemental

## Environment

Node 24+ must be on PATH. If `node` is not found, add your Node install's `bin` folder to PATH first.

## Commands

- `npm run dev`: dev server at http://localhost:5173.
- `npm run check`: types, lint, formatting, unit tests and docs. Required before finishing.
- `npm run test:e2e`: builds, serves on port 4173 and runs the Playwright smoke test.
- `npx prettier --write <files>`: fixes formatting failures.

## Preview pane

The workspace `.claude/launch.json` defines `elemental-web` on port 5174, so it does not clash with another Vite app on 5173.
