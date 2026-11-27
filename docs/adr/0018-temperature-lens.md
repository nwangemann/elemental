# 18. Temperature lens: phase from melting and boiling points at 1 atm

- Status: accepted
- Date: 2026-11-26
- Extends: [ADR 11](0011-lenses.md)

## Context

A third lens sets a temperature T and shows each element's state there: solid, liquid or gas. The data has, per element, a melting and a boiling point in kelvin from PubChem and a standard state at room temperature. 93 elements have both points, 10 only a melting point (At, Fr, Pa, Bk–Lr) and 15 neither (Rf–Og). The points are those normally quoted, which means 1 atm except where an element does something else at 1 atm.

## Decision

**Rule.** `phaseAt(e, T)` in `core/temperature.ts`: solid below the melting point, liquid from it to below the boiling point, gas from the boiling point up. A point belongs to the warmer state. At 298.15 K this matches the stored standard state for all 103 elements with a melting point, which the tests check.

**Overrides.** Two cases where the stored numbers are not 1 atm behaviour, kept small and commented in the code:

- Sublimation: wherever the boiling point is at or below the melting point, the element goes straight from solid to gas at the boiling point. In the data that is only arsenic (sublimes at 887 K; its 1,090 K melting point is under pressure). This is a rule, not a list, so new data is handled the same way.
- Helium: its 0.95 K melting point is at about 25 atm; at 1 atm it never freezes, so it is liquid from 0 K to its boiling point. This one is a named entry.

Carbon is left as the data has it (melts at 3,823 K, boils at 4,098 K), though at 1 atm it sublimes near 3,900 K; the lens follows the source rather than adding numbers of its own.

**Unknown.** With no melting point, or above the melting point with no boiling point, the phase is unknown and the tile takes the filtered-out dim, not a guess. This makes francium (melting point about 300 K, estimated, no boiling point) unknown at body temperature rather than liquid, and astatine unknown above 575 K.

**Scale.** The slider covers 0 to 6,000 K (the highest boiling point is 5,869 K) on a log scale with an offset, `K = 50 · ((1 + 6000/50)^p − 1)`: 0 maps to 0 K, 0–400 K takes about 45% of the track, room temperature sits near 0.40 and 3,000 K near 0.86. `positionOf` is its exact inverse. Detents at room (298.15 K), body (310.15 K) and water's boiling point (373.15 K) snap within 0.003 of track; room and body are only 0.008 apart, so the windows must stay under half that and never overlap.

**Link and state.** The store holds `lens.temperature` in kelvin, null when the lens is off (the default). Deep links carry it as `?t=` in kelvin to at most two decimals, beside `?lens=` and `?colour=`; out-of-range values clamp to the scale and non-numbers are ignored.

## Consequences

- The scene eases each tile's shown phase (0 solid, 1 liquid, 2 gas) at one state per 0.4 s, at once with reduced motion; unknown tiles keep the solid shape and take the dim (a share of the filters' dim, so a filtered-out tile still reads as more excluded).
- Gas tiles float up by `CONFIG.tiles.gasLift` (0.3, under the 0.45 climb limit, so the figure can still step onto one from a solid neighbour) through the same `tileTop` the height lens uses, so labels, the tap marker and footing follow. They turn see-through by a screen-door dither (`discard` on a 4×4 ordered pattern) rather than blending, so the tiles stay one opaque draw call with no sorting; the cost is a visible stipple, read here as vapour. Labels stay solid on top, so a gas tile's symbol stays readable.
- Liquid tiles ripple: the tile shader tilts the top face's normal by rings from its centre and a slower cross wave, scaled by how near the shown phase is to liquid. It is shading only, so labels and footing are unchanged; reduced motion turns it off. Like the families' glow pulse it is ambient motion, so once the scene is still it plays at the idle frame rate ([ADR 16](0016-idle-frame-pacing.md)) rather than keeping frames coming.
- The lens can disagree with a textbook for elements the data does not describe at 1 atm (carbon). An honest unknown is shown where the data stops, so the superheavy row and a few actinides grey out at every temperature.
