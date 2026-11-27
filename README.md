# elemental

A walkable periodic table. A small figure strolls across a 3D table of the elements; each tile wakes up as you step onto it (gold turns to polished gold, neon glows like a sign) and opens that element's data. An explorer jumps straight to any element by name, symbol, number or property.

> Status: version 0.1.0, the first walkable table. All 118 elements are drawn and a small figure walks across them with a follow camera; tiles wake into their family's material (brushed metal, chalky mineral, neon glow, radioactive pulse) as it steps on them, and a panel in the family's accent colour shows the element's overview and properties. You can walk with the keyboard, by clicking or tapping a tile, or with an on-screen joystick on touch screens, and jump to any element with the explorer, the plain element list or a link like `#/Au`. Next: particles, sound and other effects per family.

## Controls

- Walk: WASD or the arrow keys; hold Shift to walk slowly.
- Step tile to tile: I, J, K, L (up, left, down, right).
- Step by atomic number: `[` and `]` (previous and next element, stopping at H and Og).
- Back to the table: R or Home walks the figure back to the last tile it stood on; after a couple of seconds on the ground a "Back to the table" button appears too.
- Element panel: Enter or Space opens it and moves focus into it; Esc closes it. Its tabs show an overview, the properties and the atom: the electron shells drawn from the measured configuration, with a note when the element breaks the usual filling order (chromium, copper and 17 others).
- All keys: press `?` or the Keys button.
- Walk somewhere: click or tap a tile and the figure walks to it. Any key or the joystick takes over.
- Touch: drag the joystick at the bottom left (shown on touch screens).
- Zoom: mouse wheel, two-finger pinch, or `+` / `-`.
- Explore: `⌘K` / `Ctrl K`, `/` or the Explore button. Search by name, symbol or number, sort and filter, then Enter or click to jump there. Filters also dim the tiles they leave out on the table.
- List: the List button shows every element as a plain table (number, symbol, name, family, period, group); choose a name to walk there. Use it with a screen reader or instead of the 3D scene.
- Height lens: the Height menu or `H` (`Shift H` backward) raises every tile by a property (density, melting point, discovery year and more), turning the table into a landscape you can walk over: small steps are hopped up, taller cliffs stop a walk (the I J K L steps and R still climb them). Elements with no known value stay flat. The element list adds a column for the property.
- Colour lens: the Colour menu or `G` (`Shift G` backward) tints every tile by a property on a light green-to-yellow scale, with a key showing the lowest and highest values; elements with no known value turn grey. The tile you stand on keeps its own colour. Pair it with the height lens to read two properties at once.
- Temperature lens: the Temperature switch or `T` shows every element as it is at a temperature from 0 to 6,000 K at normal pressure. Drag the slider (or use Room, Body and Water boils): melted tiles ripple, boiling ones float up and turn see-through, and elements whose state isn't known grey out. A line under the slider counts each state, and the element panel adds the state at that temperature ("At 310 K: Liquid" for gallium).
- Link to an element: add `#/` and its symbol to the address, for example `#/Au`, `?lens=` to raise the tiles and `?colour=` to tint them and `?t=` for a temperature in kelvin, for example `#/Au?lens=density&colour=meltingPoint` or `#/Ga?t=310.15`.

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
npm run test:e2e   # production build in headless Chromium, incl. an accessibility audit
npm run perf       # time to first move and frame work, see docs/performance.md
```

## Docs

- [Architecture](docs/architecture.md)
- [Decisions (ADRs)](docs/adr/)
- [Standards](docs/standards.md)
- [Performance](docs/performance.md)
- [Dependencies](docs/dependencies.md)
- [Data sources](docs/data-sources.md)
- [How it was built with an AI agent](docs/ai-workflow.md)

## Licence

MIT. Third-party data and assets are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
