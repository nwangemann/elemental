# elemental

A walkable periodic table. A small figure strolls across a 3D table of the elements; each tile wakes up as you step onto it (gold turns to polished gold, neon glows like a sign) and opens that element's data. An explorer jumps straight to any element by name, symbol, number or property.

> Status: early development. The table is drawn (all 118 tiles with labels) and a small figure walks across it with a follow camera; tiles wake into their family's material (brushed metal, chalky mineral, neon glow, radioactive pulse) as it steps on them, and a panel in the family's accent colour shows the element's overview and properties. You can walk with the keyboard, by clicking or tapping a tile, or with an on-screen joystick on touch screens, and jump to any element with the explorer or a link like `#/Au`.

## Controls

- Walk: WASD or the arrow keys; hold Shift to walk slowly.
- Step tile to tile: I, J, K, L (up, left, down, right).
- Back to the table: R or Home walks the figure back to the last tile it stood on; after a couple of seconds on the ground a "Back to the table" button appears too.
- Element panel: Enter or Space opens it and moves focus into it; Esc closes it.
- All keys: press `?` or the Keys button.
- Walk somewhere: click or tap a tile and the figure walks to it. Any key or the joystick takes over.
- Touch: drag the joystick at the bottom left (shown on touch screens).
- Zoom: mouse wheel, two-finger pinch, or `+` / `-`.
- Explore: `⌘K` / `Ctrl K`, `/` or the Explore button. Search by name, symbol or number, sort and filter, then Enter or click to jump there.
- Link to an element: add `#/` and its symbol to the address, for example `#/Au`.

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
