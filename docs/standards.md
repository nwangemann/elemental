# Standards

- Strict TypeScript with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Components PascalCase, modules camelCase, named exports.
- `src/core` stays free of React, three and DOM imports.
- Hot paths allocate nothing per frame: reuse vectors and objects, never create them inside `useFrame`.
- Performance budget: 60 fps on an integrated-GPU laptop (frame time p95 under 16.7 ms), fewer than 50 draw calls in the idle scene, and initial JavaScript under 350 KB gzipped. The bundle is currently 381 KB, over that target; `npm run size:check` (part of `npm run check`) fails above a 400 KB ceiling so growth is caught in the change that causes it, and a reduction pass is planned.
- Every data source is free and recorded in `docs/data-sources.md`; every dependency is listed in `docs/dependencies.md` (`npm run docs:check` enforces this).
- Accessibility: the DOM interface is fully keyboard-usable with a visible focus ring, text meets WCAG AA contrast, and everything the 3D scene shows is also reachable as text.
- The scene is playable with the keyboard alone: WASD and arrow keys walk, other keys step from tile to tile and open and close the element panel, and no control needs a key chord or precise timing.
- Conventional Commits. `npm run check` must pass before every commit (pre-commit hook) and in CI.
