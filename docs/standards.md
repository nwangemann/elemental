# Standards

- Strict TypeScript with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Components PascalCase, modules camelCase, named exports.
- `src/core` stays free of React, three and DOM imports.
- Hot paths allocate nothing per frame: reuse vectors and objects, never create them inside `useFrame`.
- Performance budget: 60 fps on an integrated-GPU laptop (frame time p95 under 16.7 ms), fewer than 50 draw calls in the idle scene, and JavaScript under 100 KB gzipped for the shell that paints first and under 450 KB gzipped in total, with the scene interactive within 2 s on a fast connection (ADR 0003). Today the shell is 71 KB and the total 299 KB; `npm run size:check` (part of `npm run check`) fails above ceilings of 76 KB and 324 KB (the total raised for combine mode, ADR 0003 amendments), so growth is caught in the change that causes it.
- Every data source is free and recorded in `docs/data-sources.md`; every dependency is listed in `docs/dependencies.md` (`npm run docs:check` enforces this).
- Accessibility: the DOM interface is fully keyboard-usable with a visible focus ring, text meets WCAG AA contrast, and everything the 3D scene shows is also reachable as text (the tile status, the element panel and the element list). `e2e/a11y.spec.ts` enforces the audit and contrast, including text over the scene.
- The scene is playable with the keyboard alone: WASD and arrow keys walk, other keys step from tile to tile and open and close the element panel, and no control needs a key chord or precise timing.
- Conventional Commits. `npm run check` must pass before every commit (pre-commit hook) and in CI.
