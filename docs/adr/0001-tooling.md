# 1. Tooling

- Status: accepted
- Date: 2026-11-26

## Context

elemental is a browser app whose core is a three.js scene, unlike the earlier Expo projects. It needs a fast dev server, strict types and a check that runs before every commit.

## Decision

- Vite 8 with the React TypeScript template, Node 24, npm.
- TypeScript 7 (the native compiler) in strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- oxlint (the template default) instead of ESLint: much faster, with the React hooks rules this project needs. Prettier for formatting.
- Vitest for unit tests, Playwright for one smoke test against the production build.
- Husky runs `npm run check` before each commit; commitlint enforces Conventional Commits. A GitHub Actions workflow runs the same checks.
- MIT licence.

## Consequences

oxlint has fewer plugins than ESLint; if a rule we need is missing, revisit this record rather than running both.
