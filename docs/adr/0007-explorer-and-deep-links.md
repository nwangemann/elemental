# 7. Explorer search, fly-to and deep links

- Status: accepted
- Date: 2026-11-26

## Context

The explorer has to find any element fast (by name, symbol, number or property), take the character there without walking, and give every element a shareable address. The app is a single page served as static files, with no router and no server to rewrite paths.

## Decision

- **Search and sort are pure functions in `core/explorer.ts`.** A query matches in tiers: exact (number, symbol or name), prefix, contains, then fuzzy (letters in order, letters only, three or more characters). Results are grouped by tier and ordered by the chosen sort inside each tier, so an exact symbol always comes first while a broad query still follows the sort. Unknown values always sort last, whichever direction. No fuzzy-search library: 118 short names need a few dozen lines, and the rules stay testable.
- **Fly-to is a request in the store.** The explorer calls `flyTo(number)`; `scene/FlightHandler.tsx` subscribes and teleports the controller to the tile's centre at rest. The camera's existing spring follow glides across the table, and the tile wakes through the normal enter path, so nothing else needs to know a flight happened.
- **Deep links live in the hash: `#/Au`.** Static hosting serves any hash without rewrites. The scene spawns on the linked element; afterwards the address follows the tile under the character with `history.replaceState`, so walking does not fill the back button's history. Editing the hash by hand flies there. Lower case, numbers and names (`#/au`, `#/79`, `#/gold`) are accepted and rewritten to the canonical symbol.
- **The palette is a native `<dialog>`** opened with `showModal`, which gives focus containment, the backdrop and Esc for free. The search box is a WAI-ARIA combobox over a listbox (`aria-activedescendant`), so focus stays in the box while the arrows move through results. Key events stop at the dialog, so they never walk or zoom the scene.

Alternatives: path routes (`/Au`) need server rewrites on static hosting; pushing a history entry per tile would make Back step through every tile walked; walking the character to a chosen element (pathing across the table) is slow for a jump of the whole table and is what click-to-walk already does.

## Consequences

- The palette ships in the chunk shared with the panel and the element data, not in the shell.
- The teleport is instant; a hop and a "poof" are visual extras for the effects phase.
- Rapid scripted hash changes can be coalesced by the browser; a person editing the address bar is unaffected.
