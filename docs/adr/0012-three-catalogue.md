# 12. A curated `three` namespace for React Three Fiber

- Status: accepted
- Date: 2026-11-26

## Context

React Three Fiber 9 does `import * as THREE from 'three'` and, when a `<Canvas>` mounts, `extend(THREE)`: every three export becomes a possible JSX element. Because the whole namespace object is used as a value, the bundler cannot drop any export, and three was 179 KB of the 379 KB gzipped total (ADR 0003), against a 380 KB ceiling. The scene uses about a dozen three classes as JSX elements, and R3F's own code reads about twenty more names off `THREE` (renderer, cameras, colour space, tone mapping and shadow constants).

## Decision

- **In the production build, R3F's `three` import resolves to `src/scene/threeCatalogue.ts`**, which re-exports only the names R3F reads and the classes behind the lowercase JSX elements the scene uses. A small Vite plugin (`scripts/three-catalogue.ts`, build only) does the redirect, and only for importers inside `@react-three/fiber`; app code and troika still import the real `three`, by name.
- **The dev server keeps the full namespace.** It pre-bundles R3F before plugins see the import, and redirecting there would mean taking R3F out of dependency pre-bundling for no saving.
- **A unit test (`scripts/three-catalogue.test.ts`) guards the gap** between the two: every lowercase JSX tag in `src` that names a three class must be in the catalogue, and every `THREE.X` in R3F's installed `dist` must be too. A new JSX element or an R3F upgrade that reads a new name fails `npm run check`, not the built app at runtime.

## Consequences

- three drops from 179 to 131 KB gzipped, the total from 379 to 327 KB. The `THREE` namespace object the bundler wrote (about 3 KB) goes too. On the slow profile the scene chunk arrives about 0.26 s sooner and the first move comes at 2.37 s instead of 2.6 s.
- Adding a JSX element whose class is new to the scene means adding it to `threeCatalogue.ts`; the test names the missing class. Classes used only through imports in app code (`new RingGeometry()`) need nothing.
- A missing name would only show in a production build. The test covers the two known sources of names; e2e runs against the production build as a second net.
- Drop this if R3F stops extending the whole namespace by default, or if it starts reading `THREE` through something the test's `THREE.X` scan does not see.
