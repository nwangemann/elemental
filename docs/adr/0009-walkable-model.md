# 9. Walkable model: tiles on open ground

- Status: accepted
- Date: 2026-11-26

## Context

Until now the character walked a flat rectangle at tile height: the controller clamps its centre to the table's footprint (`tableBounds`) and its height stays at the tile top wherever it is. An audit of every kind of edge in the running scene showed what that means:

- **Outer edge:** an invisible wall exactly at the footprint. Nothing on screen says why the figure stops.
- **d-block notch** (between H and He, above Sc–Zn): the figure walks on air at tile height across the empty cells.
- **Gap row above the f-block:** the same; it hovers between Ra and Ac.
- **Corners beside the f-block** (under Fr/Ra, right of No/Lr): the same, and the outer wall cuts across them.
- **Gaps between tiles** (0.15 wide, narrower than the body): visually fine, since the body covers them.
- The ground is so close to the sky colour that the scene reads as tiles floating in a void, which makes walking on air look like a bug rather than a choice.

## Decision

- **Hybrid model: tiles are low platforms on open ground.** Every point that is not over a tile is ground at height 0, inside the footprint or outside it. Leaving a tile drops the figure onto the ground; moving onto a tile hops it up (the tiles are 0.18 high, under a third of the figure). Activation follows the surface: a tile wakes only when the figure is on top of it.
- **Gaps between tiles are bridged, not dropped into.** A tile supports the body's centre up to `BOUNDARY.support` (0.1) past its edge: more than half the gap, so walking from tile to tile never dips, and less than the body radius (0.2), so at a real edge the figure drops once about half of it hangs over.
- **The gap row is ground, with no bridge.** It is one tile-width of empty space like the notch; crossing it is a drop and a hop, the same rule as everywhere else. A bridge would add geometry and a special case for one row.
- **The walkable area is the table plus 1.5 units of ground on every side** (`BOUNDARY.margin`, about one and a half tiles). Enough to step off and look at the edge, close enough that the way back is one hop. Its limit will push back softly and be visible, not an invisible wall.
- **"Off the table" means standing on the ground**, wherever that is: inside the notch, in the gap row or in the margin. A bridged gap between tiles is never "off".
- The rules live in `core/boundary.ts`: `surfaceAt(x, z)` (tile number or `GROUND`), `groundHeightAt` and `outerBounds`.

### Alternatives

- **Tiles only** (clamp the figure to tile tops, empty cells as walls): no falling, but walls appear in the middle of the table at the notch and gap row, and a pointer target over empty space has to be refused or rerouted.
- **Step off and hop back** (any edge drops into a void or resets the figure): reads as failure and needs a respawn; wrong for a calm, exploratory piece.

## Consequences

- The scene needs a vertical state for drops and hops, activation that waits for the figure to be on top, a soft outer limit with a visible edge, and a way back to the last tile after wandering off. These are separate steps on the plan.
- The ground must read as ground against the sky, or the margin looks like a void.
- `tileAtPoint`'s hysteresis stays for which tile is active; `surfaceAt` answers what holds the figure up. The two agree on tile tops and differ only within a body's width of an edge.
