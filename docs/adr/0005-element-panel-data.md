# 5. Element data in a shared chunk for the panel

- Status: accepted
- Date: 2026-11-26

## Context

The element panel is DOM interface, so it lives in the shell (ADR 3), but it needs far more than the store's `activeTile` (number and name): family, mass, configuration, temperatures, density and the rest. The dataset is about 10 KB gzipped and lived only in the lazily loaded scene chunk. ADR 4 left two ways open: a data chunk of its own, or more fields through the store.

## Decision

- **The panel is lazily loaded** (`React.lazy` in `App.tsx`) and imports the dataset and the pure formatting in `core/elementFacts.ts` directly.
- **The bundler splits the dataset into a chunk shared by the scene and the panel.** Both import `core/elements`, so Rollup moves it into its own chunk, downloaded once. The shell imports neither.
- **The store keeps only the active tile's number and name.** The panel looks the element up by number.

Alternatives: putting display fields into the store would make the scene the panel's data source and grow the store with every new tab; importing the data into the shell would add about 10 KB to it for a panel that has nothing to show until the scene has loaded anyway.

## Consequences

- Shell unchanged at 68 KB; the panel chunk is about 2 KB gzipped, and the data chunk is requested in parallel with the scene.
- The explorer (1.11), which should work before the scene, can import the same data chunk without touching the shell budget.
- Accent colours come from `accentTokens` in `core/palette.ts`, the seam the theme system replaces.
