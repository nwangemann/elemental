# Changelog

## Unreleased

- Climbing the height lens landscape: the figure hops up small steps (a bigger step gets a bigger, slower hop), falls down onto lower tiles, and stops at cliffs taller than about two and a half tiles, sliding along the face. A tap that would walk into a cliff stops there; I J K L, `[` `]` and R still climb it, so the keyboard reaches every tile. Taps pick the raised tile you actually see, and the camera rises with the figure.
- Height lens: the Lens menu (or `H`, `Shift H` backward) raises every tile by a property, so density, melting point, electronegativity, radius or discovery year becomes a landscape you can walk across. Tiles ease to their new heights in about half a second (at once with reduced motion), labels ride along, and elements with no known value stay flat. The element list gains a column for the property, and the lens goes into the link (`#/Au?lens=density`).
- Tile labels draw from a pre-rendered glyph atlas instead of a text library: about 40 KB less JavaScript, no font download, labels show as soon as the table does, and frame work while walking halves.
- The element panel says where an element stands out: "Densest of all elements", "3rd highest melting point of all elements", "Most electronegative in period 6". After you've seen another element it adds one comparison with it, picking the most striking difference ("Compared with Iron: 3.5× heavier").
- Explorer filters now show on the table: tiles that don't match fade to a dim grey, so "noble gases" or "period 6" lights up its own part of the table. The dimming stays after the explorer closes, the Explore button says "Filtered" while it does, and the tile you stand on always keeps its colour.
- `npm run size:check` prints the gzipped JavaScript by npm package, and `npm run perf` also reports time to first move on a slow connection.
- `[` and `]` step to the previous or next element by atomic number: the figure walks there, so H → He → Li tours the table in order. They work on any keyboard layout and stop at hydrogen and oganesson.
- On phones the joystick floats: drag anywhere on the scene and it appears under your thumb, instead of sitting in a fixed spot that could cover the figure. A short tap still walks to a tile, and a second finger still pinches to zoom. A drag that wanders and comes back to where it started no longer counts as a tap.
- On phones, while the element sheet is open, the view shifts up so the figure sits in the middle of the visible scene instead of at the sheet's edge, and eases back when the sheet closes (a cut with reduced motion).
- Tap-to-walk feedback: a tap or click leaves a square marker on the tile it chose (or a small one on the ground), which pulses once as the tap lands and stays faintly until the figure arrives. With reduced motion it fades in place without growing.

## 0.1.0 — 2026-11-26

The first walkable table: walk onto any of the 118 elements, read its data, and jump to others with the explorer.

- Element list: the List button shows every element as a plain table (number, symbol, name, family, period, group) with the current tile marked; choosing a name walks there. The interface buttons come before the scene in the tab order, and an automated accessibility audit (WCAG 2.2 AA, including text contrast over the scene) runs with the browser tests.
- Faster start: the table is walkable about a second sooner, because tile labels are now built in background workers and no longer hold up the first frame.
- Adaptive resolution: on a GPU that can't keep up, the scene lowers its resolution a step at a time to hold the frame rate, and raises it again when there is room.
- With reduced motion on, jumping to an element from the explorer or a link cuts straight to it instead of gliding.
- `npm run perf` measures time to first move and frame work on the production build.
- Getting back: R or Home walks the figure back to the last tile it stood on, and after two seconds on the ground a "Back to the table" button appears. The status tells screen-reader users how to return.
- Off the edge: the figure can step off a tile onto the ground and drops with an eased fall; walking back into a tile hops it up on a short arc. A tile only wakes once the figure stands on top of it. Past the table a ground margin ends in a soft limit that pushes back, with a visible edge, and the camera keeps the table in frame.
- Keyboard access: I, J, K and L step tile to tile, Enter or Space opens the panel and moves focus into it, Esc backs out, and `?` shows the key map. The scene is focusable with a visible focus ring and a label, and keys typed in text fields never walk the figure.
- Explorer: `⌘K`, `/` or the Explore button opens a palette that searches elements by name, symbol or number (forgiving of typos), sorts them by number, name, mass, discovery year, density, electronegativity or melting point, and filters by family, state, block, period and group. Choosing one puts the character on that tile and the camera glides there. Every element has a link (`#/Au`), and the address follows the tile you stand on.
- Click or tap a tile and the character walks straight to it, slowing to a stop on its centre. On touch screens an on-screen joystick walks it at any speed; it sits above the panel sheet on phones. The keyboard always takes over, then the joystick, then a clicked target.
- Element families have themes: a tile wakes into its family's surface when the character steps on it (brushed transition metals, chalky alkaline earths, glassy metalloids, glowing noble gases, pulsing actinides and more), and the panel takes its accent from the same theme. All tiles still draw in one call.
- Element panel: while the character stands on a tile, a panel slides in with the element's overview (family, state, mass, electron configuration, discovery) and properties (melting and boiling points, density, electronegativity, radius, ionization energy, electron affinity, oxidation states), with units and in the family's accent colour. On narrow screens it is a sheet along the bottom.
- Tiles wake when the character steps on them: the tile rises with the character on it and a warm ring grows around it; leaving reverses it over a quarter second. A screen-reader status announces the tile ("Standing on Hydrogen").
- The page paints a light shell (about 70 KB of gzipped JavaScript) and loads the 3D scene as a separate chunk behind it.
- Follow camera: an establishing shot glides from the whole table down to the character (skipped under reduced motion), then the camera follows with a critically damped spring and a little look-ahead. Zoom with the wheel, a pinch or `+`/`-`.
- The character walks with WASD or the arrow keys (Shift to walk slowly): it speeds up and slows down smoothly, turns to face where it goes, leans into turns.
- A procedural bean character stands on hydrogen: it breathes when idle and has a walk cycle driven by speed.
- The app bundle no longer includes zod (357 KB gzipped, down from 381 KB).
- Dev-only tuning panel: `?tune` on the dev server shows live sliders for tile, label and camera settings.
- Element data for all 118 elements from PubChem and Wikidata, generated by `npm run data` and validated against a schema.
- Project scaffold: Vite, React, strict TypeScript, oxlint, Prettier, Vitest, Playwright, commit hooks and docs.
