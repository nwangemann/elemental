# elemental

A walkable periodic table. A small figure strolls across a 3D table of the elements; each tile wakes up as you step onto it (gold turns to polished gold, neon glows like a sign) and opens that element's data.

**Try it:** https://nwangemann.github.io/elemental/ (the latest release).

What each release added is in the [changelog](CHANGELOG.md).

## What it does

- **Walk the table.** All 118 elements are tiles on open ground. A small figure walks across them with a follow camera; each tile wakes into its family's material as it is stepped on (brushed metal, chalky mineral, neon glow, radioactive pulse), and the element panel opens in the family's accent colour.
- **Read an element.** The panel ranks the element against the rest ("Densest of all elements"), compares it with the last one you stood on, and has three tabs: an overview (including where it is found, with its share by mass), its properties, and its atom, the electron shells drawn from the measured configuration, with a note when it breaks the usual filling order (chromium, copper and 17 others).
- **Find an element.** The explorer searches by name, symbol or number, sorts and filters, and flies the figure there; its filters also dim the tiles they leave out. The element list shows every element as a plain table. Links name an element and the lenses (below).
- **Read the whole table with lenses.** Height raises every tile by a property (density, melting point, discovery year and more), turning the table into a landscape to climb: small steps are hopped up, taller cliffs stop a walk. Colour tints every tile from teal (lowest) to yellow (highest), with a key. Temperature shows each element as solid, liquid (rippling) or gas (floating, see-through) at a temperature from 0 to 6,000 K. Discovery shows the table as chemists knew it in a year from antiquity to 2010, and can play forward so the table assembles itself. Elements with no known value stay flat or turn grey.
- **Combine atoms into compounds.** Pick up atoms of the elements you stand on; they follow the figure as small coloured orbs. A tray says what they make or could become and suggests what to add, and the table dims the elements that lead nowhere. When the atoms match one of 40 everyday compounds exactly, they spring together into its real 3D shape over the figure's head: a ball-and-stick molecule, a crystal chunk for salts and minerals, a metal ingot for steel and bronze. Its card explains it in plain words: how it holds together (with links to each element's electron shells), where you meet it, its isomers, and for some a scale ladder of what it builds up into (glucose → starch → bread). **Show me** walks (or flies) the figure to each element and gathers the atoms for you. Contexts (your body, air, the kitchen, the Earth's crust) light the elements each is made of and raise the tiles by their share of its mass.

## Controls

- Walk: WASD or the arrow keys; hold Shift to walk slowly. Or click or tap a tile and the figure walks to it.
- Touch: drag on the scene and a joystick appears under your thumb (phones), or use the pad at the bottom left (larger touch screens). Tap a tile to walk there; pinch to zoom.
- Step tile to tile: I, J, K, L. Step by atomic number: `[` and `]`.
- Back to the table: R or Home (a "Back to the table" button also appears after a couple of seconds off it).
- Zoom: mouse wheel, pinch, or `+` / `-`.
- Element panel: Enter or Space opens it and moves focus into it; Esc closes it. Arrow keys move between its tabs.
- Explore: `⌘K` / `Ctrl K`, `/` or the Explore button. List: the List button.
- Lenses: `H` height, `G` colour (Shift goes backward through the properties), `T` temperature, `Y` discovery year.
- Combine: `C` or the panel's **Add to Combine** picks up one atom of the element underfoot (up to 5 elements and 24 atoms); `Backspace` drops the last one; Esc closes the card, then the tray, and keeps what you carry.
- All keys: `?` or the Keys button.

Links: `#/Au` (or `#/79`, `#/gold`) starts on an element. Add `?lens=` to raise the tiles, `?colour=` to tint them, `?t=` for a temperature in kelvin, `?year=` for a year (or `antiquity`) and `?context=` to open Combine on a context (`body`, `air`, `kitchen` or `earth`), for example `#/Au?lens=density&colour=meltingPoint`, `#/Ga?t=310.15`, `#/Ne?year=1869` or `#/O?context=body`.

## Accessibility and browsers

Everything the scene shows is also available as text: a status line tells screen readers which tile is underfoot, the panel holds the data, and the element list is a plain table. The interface works from the keyboard alone, meets WCAG 2.2 AA (checked by an automated audit in the browser tests) and follows the system's reduced-motion setting. The table needs WebGL2, which current desktop and mobile browsers have; where it is missing, the page says so and the panel, explorer and list still work.

## Stack

- [three.js](https://threejs.org/) through [React Three Fiber](https://r3f.docs.pmnd.rs/) for the scene, React 19 for the interface
- Vite 8, TypeScript 7 (strict), oxlint, Prettier
- Vitest for unit tests, Playwright for the browser tests (feature walkthroughs and an accessibility audit) and performance runs

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

CI runs `check` and the browser tests on every push and pull request (`.github/workflows/check.yml`).

## Release it

Move the changelog's Unreleased entries under a new version heading, set `version` in `package.json`, then tag and push, for example `git tag v0.3.1 && git push origin v0.3.1`. The tag deploys itself to GitHub Pages (`.github/workflows/deploy.yml`, [ADR 21](docs/adr/0021-pages-deploy.md)); `main` alone never goes live.

## Docs

- [Architecture](docs/architecture.md)
- [Decisions (ADRs)](docs/adr/README.md)
- [Standards](docs/standards.md)
- [Performance](docs/performance.md)
- [Dependencies](docs/dependencies.md)
- [Data sources](docs/data-sources.md)
- [How it was built with an AI agent](docs/ai-workflow.md)

## Licence

MIT. Third-party data and assets are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
