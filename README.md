# elemental

A walkable periodic table. A small figure strolls across a 3D table of the elements; each tile wakes up as you step onto it (gold turns to polished gold, neon glows like a sign) and opens that element's data. An explorer jumps straight to any element by name, symbol, number or property.

> Status: early development. The table is drawn (all 118 tiles with labels) and a small figure walks across it with a follow camera; tiles reacting to the figure come next.

## Controls

- Walk: WASD or the arrow keys; hold Shift to walk slowly.
- Zoom: mouse wheel, two-finger pinch, or `+` / `-`.

## Stack

- [three.js](https://threejs.org/) through [React Three Fiber](https://r3f.docs.pmnd.rs/) for the scene, React 19 for the interface
- Vite 8, TypeScript 7 (strict), oxlint, Prettier
- Vitest for unit tests, Playwright for a browser smoke test

Element data comes from free public sources (PubChem, Wikidata), fetched at build time; see [docs/data-sources.md](docs/data-sources.md).

## Run it

Requires Node 24 or later.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Check it

```bash
npm run check      # types, lint, formatting, unit tests, docs, bundle size
npm run test:e2e   # production build in headless Chromium
```

## Docs

- [Architecture](docs/architecture.md)
- [Decisions (ADRs)](docs/adr/)
- [Standards](docs/standards.md)
- [Dependencies](docs/dependencies.md)
- [Data sources](docs/data-sources.md)
- [How it was built with an AI agent](docs/ai-workflow.md)

## Licence

MIT. Third-party data and assets are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
