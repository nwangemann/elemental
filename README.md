# elemental

A walkable periodic table. A small figure strolls across a 3D table of the elements; each tile wakes up as you step onto it (gold turns to polished gold, neon glows like a sign) and opens that element's data. An explorer jumps straight to any element by name, symbol, number or property.

**Try it:** https://nwangemann.github.io/elemental/ (the latest release).

> Status: version 0.2.0 is live. All 118 elements are drawn and a small figure walks across them with a follow camera; tiles wake into their family's material as it steps on them, and a panel in the family's accent colour shows the element's overview, properties and atom (its electron shells). Four lenses read the whole table at once: height, colour, temperature and discovery year. Combine mode carries atoms and forms real compounds over the figure, each with a card that explains it. You can walk with the keyboard, by clicking or tapping a tile, or with an on-screen joystick, and jump to any element with the explorer, the element list or a link like `#/Au`. Next: scale ladders and isomer notes on the compound cards. See the [changelog](CHANGELOG.md).

## Controls

- Walk: WASD or the arrow keys; hold Shift to walk slowly.
- Step tile to tile: I, J, K, L (up, left, down, right).
- Step by atomic number: `[` and `]` (previous and next element, stopping at H and Og).
- Back to the table: R or Home walks the figure back to the last tile it stood on; after a couple of seconds on the ground a "Back to the table" button appears too.
- Element panel: Enter or Space opens it and moves focus into it; Esc closes it. Its tabs show an overview, the properties and the atom: the electron shells drawn from the measured configuration, with a note when the element breaks the usual filling order (chromium, copper and 17 others).
- Combine: `C` or the panel's **Add to Combine** picks up one atom of the element underfoot, and the atoms float after the figure as small coloured orbs, stacked by element (up to 5 elements and 24 atoms). `Backspace` drops the last one. A Combine tray along the bottom lists what you carry with − / + steppers and **Clear**, says in words what it makes or could become ("Carrying H 2. Makes hydrogen gas. Could become water with one O."), suggests water, table salt or carbon dioxide when you carry nothing, and lists the nearest three compounds with the atoms each needs. When you carry the right elements in the wrong amounts it teaches the ratio and offers **Fill in**. While you carry, the table dims the elements that lead nowhere and keeps the most useful ones brightest. When what you carry matches a compound exactly, the orbs spring together over the figure into its real 3D shape (a ball-and-stick molecule, a small crystal chunk for salts and minerals, a metal ingot for steel and bronze), which turns slowly, and thin arcs link its elements' tiles on the table. When one formula is several molecules (ethanol and dimethyl ether), the tray offers each. The compound's card then opens in the tray: its formula, how it holds together (shares electrons, hands them over, metal mix), where you meet it, why, what it's made of (each element a button to its tile) and what it leads to. **Show me** on a starter walks or flies the figure to each element and picks the atoms up for you; any key or tap stops it. Recently made keeps the last eight compounds, in this browser, to reopen their cards. With nothing carried, **Your body**, **Air**, **Kitchen** and **Earth & building** pick a context: its elements light up and the rest dim, tiles (except for the kitchen) stand taller the more of its mass they make up, and the tray lists its compounds, each with **Show me**. The element panel's overview says where each element is found, with its share by mass ("Your body: 64 % by mass"). Esc closes the card, then the tray, and keeps what you carry.
- All keys: press `?` or the Keys button.
- Walk somewhere: click or tap a tile and the figure walks to it. Any key or the joystick takes over.
- Touch: drag the joystick at the bottom left (shown on touch screens).
- Zoom: mouse wheel, two-finger pinch, or `+` / `-`.
- Explore: `⌘K` / `Ctrl K`, `/` or the Explore button. Search by name, symbol or number, sort and filter, then Enter or click to jump there. Filters also dim the tiles they leave out on the table.
- List: the List button shows every element as a plain table (number, symbol, name, family, period, group); choose a name to walk there. Use it with a screen reader or instead of the 3D scene.
- Height lens: the Height menu or `H` (`Shift H` backward) raises every tile by a property (density, melting point, discovery year and more), turning the table into a landscape you can walk over: small steps are hopped up, taller cliffs stop a walk (the I J K L steps and R still climb them). Elements with no known value stay flat. The element list adds a column for the property.
- Colour lens: the Colour menu or `G` (`Shift G` backward) tints every tile by a property on a light green-to-yellow scale, with a key showing the lowest and highest values; elements with no known value turn grey. The tile you stand on keeps its own colour. Pair it with the height lens to read two properties at once.
- Temperature lens: the Temperature switch or `T` shows every element as it is at a temperature from 0 to 6,000 K at normal pressure. Drag the slider (or use Room, Body and Water boils): melted tiles ripple, boiling ones float up and turn see-through, and elements whose state isn't known grey out. A line under the slider counts each state, and the element panel adds the state at that temperature ("At 310 K: Liquid" for gallium).
- Discovery timeline: the Discovery switch or `Y` shows the table as chemists knew it in a year, from antiquity to 2010. Drag the slider (or use Antiquity, Lavoisier's list, Mendeleev's table and Today): elements not yet discovered sink and turn grey, and rise into place as the year passes their discovery. Play sweeps from the chosen year to today in about 20 seconds, so the table assembles itself; touching the slider pauses it. A line under the slider counts what was known and what was still to come, and the element panel says whether the element was known that year ("In 1869: Not yet discovered" for neon).
- Link to an element: add `#/` and its symbol to the address, for example `#/Au`, `?lens=` to raise the tiles and `?colour=` to tint them `?t=` for a temperature in kelvin and `?year=` for a year (or `antiquity`), for example `#/Au?lens=density&colour=meltingPoint` `#/Ga?t=310.15` or `#/Ne?year=1869`. `?context=` opens Combine on a context (`body`, `air`, `kitchen` or `earth`), for example `#/O?context=body`.

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

CI runs `check` and the browser tests on every push and pull request (`.github/workflows/check.yml`).

## Release it

Update `CHANGELOG.md`, then tag and push: `git tag v0.3.0 && git push origin v0.3.0`. The tag deploys itself to GitHub Pages (`.github/workflows/deploy.yml`, [ADR 21](docs/adr/0021-pages-deploy.md)); `main` alone never goes live.

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
