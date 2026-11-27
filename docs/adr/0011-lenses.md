# 11. Lenses: one normalised level per tile, drawn as instance attributes

- Status: accepted
- Date: 2026-11-26

## Context

Several planned features read the whole table at once by one property: tile height by a property (a 3D bar chart to walk over), a colour heat map, a discovery timeline and the explorer's filters shown on the table. Each needs the same steps: pick a property, turn every element's value into something a renderer can use, give unknown values (13–23 elements per property, mostly superheavies) their own look, and draw it without extra draw calls.

## Decision

- **One pure module, `core/lens.ts`.** A lens maps a numeric property to a level in [0, 1] per tile over the range of known values. Each property has a default scale: density is logarithmic (it spans six orders of magnitude, from hydrogen gas to osmium), the rest linear. Unknown values get `NO_DATA` (−1) rather than 0, so a renderer can tell "lowest" from "unknown". Elements known since antiquity count as the earliest discovery.
- **One store field, `lens`**, holding the property each lens shows (`height`, `colour`, null when off) and the explorer's filters. It changes only when the player changes it; the scene subscribes and recomputes targets, never re-rendering per frame.
- **Filters dim instead of hide.** The first lens is the explorer's filters: excluded tiles fade to a darker grey through a per-instance `aDim` attribute on the tile material, so it costs no draw call. The tile under the character is lifted out of the dim as it wakes, so stepping onto a filtered-out tile still shows it. The dimming persists after the explorer closes, with a "Filtered" mark on its button as the visible cause.
- **Later lenses write into the same instance data:** height into the tile matrices already written per tile, colour into the instance colour. Levels are normalised in core, so the scene never needs to know the units.

## Consequences

- New lenses are a key in `LENS_KEYS` plus a renderer; the maths and the "no data" rule are already tested.
- Labels on dimmed tiles stay at full brightness (they are one troika batch; recolouring members would rebuild it). The planned baked label atlas can dim them per instance.
- The fade rewrites the 118-float `aDim` buffer only while a fade runs or a tile changes.
