# 14. Climbing a height lens landscape

- Status: accepted
- Date: 2026-11-26
- Extends: [ADR 9](0009-walkable-model.md)

## Context

The height lens ([ADR 11](0011-lenses.md)) raises every tile by a property, up to 1.2 units above its resting height, so the table becomes a landscape. Under density most neighbours differ by a few hundredths, but gases next to solids form steps of 0.6–1.2 (C → N, S → Cl, Br → Kr, Fr → Ra). The walkable model of ADR 9 only knew tiles at one height and the ground: the figure glided up any step on its stand smoothing (onto a column twice its own height), tap-to-walk aimed at the resting plane, so a tap on a raised tile picked whatever lay behind it, and the camera stayed at ground level while the figure stood high above it.

## Decision

- **Small steps are climbed, tall ones are cliffs.** A step up no taller than `climbLimit` (0.45, about two and a half resting tile heights) is climbed; a taller one blocks walking like the table's edge. Steps down are never blocked: the figure walks off and falls.
- **The climb reads as a hop that grows with the step.** Tile-to-tile steps up to `stepGlide` (0.12, a little more than an awake tile's rise) are smoothed as before, so ordinary walking never squashes. Taller steps up hop: steps up to `hopStep` (0.18, the ground-to-tile hop) get the base hop, taller ones scale its apex with the step and its length with the square root. Taller steps down fall under gravity and land with a squash, as off a tile onto the ground.
- **Amendment (2026-11-27): small steps up micro-hop.** A step up within `stepGlide` whose lens step is taller than `microStep` (0.03) now gets a quick, low hop (0.05 over 0.18 s) instead of a glide, so a landscape is stepped onto tile by tile. The lens step is measured without the wake rise of the tile being left, which would otherwise turn every small step up from an awake tile into a step down. Flat-table walking, where only the wake rise differs, still glides.
- **Cliffs stop the body at the face.** Blocking is per axis, so the figure slides along a cliff instead of sticking to it, and probes the body radius less the tiles' support overhang ahead of the centre, so it stops about where it touches the face. The reference height is where the feet are, or the top they are hopping onto.
- **A tap stops at a cliff; a keyboard step or a return climbs it.** A tap's walk target is dropped when the walk hits a cliff, so the figure does not push against it. I/J/K/L, `[`/`]` and R (or "Back to the table") are "go to that element" commands, and keyboard players have no other way across; their walk targets carry `climb` and hop up any step. A fly-to still puts the figure on any tile.
- **Taps pick what is drawn.** A tap's ray picks the first tile box it meets at its drawn height (top or side), or else the ground.
- **The camera climbs too.** The focus point follows the figure's feet height on the follow spring, which also smooths hops out of the view.
- The rules live in `core/climb.ts` (`isCliff`, `blockCliffs`, `pickSurface`) and `core/ledge.ts`; the values in `CONFIG.character`.

### Alternatives

- **Climb anything, slowly:** no blocking, every step a hop. Simple, but a 1.2 hop onto a column five times the resting height reads as flying, and the landscape's shape stops mattering.
- **Block every step above the glide:** the density landscape would be cut into islands; most of the table's real variety (0.05–0.3 steps vertically between periods) would become walls.
- **Ramps between tiles:** a smooth height field. Needs new geometry and hides the tile grid that the table is about.

## Consequences

- With a strong lens on, walking with WASD or the joystick can leave a region (a run of gases, the gap row under the dense f-block) only by the ground or by tile steps. R always gets back.
- Cliffs depend on the drawn heights, so they appear and vanish as the lens eases; the figure is never trapped inside a rising column, because blocking only refuses moves into one.
